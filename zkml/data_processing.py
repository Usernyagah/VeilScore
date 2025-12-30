"""
Data processing script for LendingClub dataset.
Downloads, cleans, and prepares data for credit scoring model.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging
from typing import Tuple, List
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def load_lendingclub_data(csv_path: str = None) -> pd.DataFrame:
    """
    Load LendingClub dataset from CSV.
    
    Args:
        csv_path: Path to CSV file. If None, looks in data/ directory.
    
    Returns:
        DataFrame with raw data
    """
    if csv_path is None:
        # Look for common LendingClub dataset filenames
        possible_files = [
            DATA_DIR / "accepted_2007_to_2018Q4.csv",
            DATA_DIR / "accepted_2007_to_2018.csv",
            DATA_DIR / "loan.csv",
            # Also check archive directory
            DATA_DIR / "archive" / "accepted_2007_to_2018q4.csv" / "accepted_2007_to_2018Q4.csv",
            DATA_DIR / "archive" / "accepted_2007_to_2018Q4.csv",
        ]
        
        for file_path in possible_files:
            if file_path.exists():
                csv_path = str(file_path)
                break
        
        if csv_path is None:
            raise FileNotFoundError(
                f"LendingClub CSV not found. Please download from "
                f"https://www.kaggle.com/datasets/wordsforthewise/lending-club "
                f"and place in {DATA_DIR}/ or {DATA_DIR}/archive/"
            )
    
    logger.info(f"Loading data from {csv_path}")
    df = pd.read_csv(csv_path, low_memory=False)
    logger.info(f"Loaded {len(df):,} rows, {len(df.columns)} columns")
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the dataset: handle missing values, remove irrelevant columns.
    """
    logger.info("Cleaning data...")
    
    # Remove columns with >50% missing values
    missing_threshold = 0.5
    cols_to_drop = df.columns[df.isnull().mean() > missing_threshold].tolist()
    if cols_to_drop:
        logger.info(f"Dropping {len(cols_to_drop)} columns with >50% missing: {cols_to_drop[:5]}...")
        df = df.drop(columns=cols_to_drop)
    
    # Remove ID and URL columns (not useful for prediction)
    id_cols = [col for col in df.columns if any(x in col.lower() for x in ['id', 'url', 'desc'])]
    if id_cols:
        df = df.drop(columns=id_cols)
    
    # Remove columns with single unique value
    single_val_cols = [col for col in df.columns if df[col].nunique() <= 1]
    if single_val_cols:
        df = df.drop(columns=single_val_cols)
    
    logger.info(f"After cleaning: {len(df):,} rows, {len(df.columns)} columns")
    return df


def create_target(df: pd.DataFrame) -> pd.Series:
    """
    Create binary target from loan_status.
    Default = 1, Paid/Current = 0
    """
    logger.info("Creating target variable...")
    
    # Map loan_status to binary target
    default_statuses = [
        'Charged Off', 'Default', 'Does not meet the credit policy. Status:Charged Off',
        'Late (31-120 days)', 'Late (16-30 days)'
    ]
    
    if 'loan_status' not in df.columns:
        raise ValueError("loan_status column not found in dataset")
    
    target = df['loan_status'].apply(
        lambda x: 1 if x in default_statuses else 0
    )
    
    default_rate = target.mean()
    logger.info(f"Default rate: {default_rate:.2%} ({target.sum():,} defaults out of {len(target):,})")
    
    return target


def select_features(df: pd.DataFrame, target: pd.Series, n_features: int = 25) -> List[str]:
    """
    Select top N features using correlation and mutual information.
    """
    from sklearn.feature_selection import mutual_info_classif
    
    logger.info(f"Selecting top {n_features} features...")
    
    # Separate numeric and categorical columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
    
    # Remove target-related columns
    exclude_cols = ['loan_status', 'target']
    numeric_cols = [col for col in numeric_cols if col not in exclude_cols]
    categorical_cols = [col for col in categorical_cols if col not in exclude_cols]
    
    # Fill missing values for feature selection
    df_clean = df.copy()
    for col in numeric_cols:
        df_clean[col] = df_clean[col].fillna(df_clean[col].median())
    for col in categorical_cols:
        df_clean[col] = df_clean[col].fillna('Unknown')
    
    # Encode categoricals for feature selection
    df_encoded = df_clean[numeric_cols].copy()
    for col in categorical_cols[:10]:  # Limit to avoid memory issues
        le = LabelEncoder()
        try:
            df_encoded[f'{col}_encoded'] = le.fit_transform(df_clean[col].astype(str))
        except:
            pass
    
    # Calculate mutual information
    available_cols = [col for col in df_encoded.columns if col in df_clean.columns or '_encoded' in col]
    mi_scores = mutual_info_classif(
        df_encoded[available_cols].fillna(0),
        target,
        random_state=42
    )
    
    # Get top features
    feature_scores = list(zip(available_cols, mi_scores))
    feature_scores.sort(key=lambda x: x[1], reverse=True)
    
    # Map encoded features back to original
    selected_features = []
    for feat, score in feature_scores[:n_features]:
        if '_encoded' in feat:
            original_feat = feat.replace('_encoded', '')
            if original_feat in categorical_cols:
                selected_features.append(original_feat)
        else:
            if feat in numeric_cols:
                selected_features.append(feat)
    
    # Ensure we have enough features
    if len(selected_features) < n_features:
        # Add remaining numeric features by correlation
        remaining_numeric = [col for col in numeric_cols if col not in selected_features]
        if remaining_numeric:
            corr_scores = df_clean[remaining_numeric].corrwith(target).abs().sort_values(ascending=False)
            additional = corr_scores.head(n_features - len(selected_features)).index.tolist()
            selected_features.extend(additional)
    
    selected_features = selected_features[:n_features]
    logger.info(f"Selected {len(selected_features)} features: {selected_features[:10]}...")
    
    return selected_features


def encode_features(df: pd.DataFrame, feature_cols: List[str], fit: bool = True, 
                   encoders: dict = None) -> Tuple[pd.DataFrame, dict]:
    """
    Encode categorical features and scale numeric features.
    """
    logger.info("Encoding features...")
    
    df_encoded = df[feature_cols].copy()
    if encoders is None:
        encoders = {}
    
    # Separate numeric and categorical
    numeric_cols = [col for col in feature_cols if df[col].dtype in [np.number, 'float64', 'int64']]
    categorical_cols = [col for col in feature_cols if col not in numeric_cols]
    
    # Encode categoricals
    for col in categorical_cols:
        if fit:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df[col].astype(str).fillna('Unknown'))
            encoders[col] = le
        else:
            le = encoders.get(col)
            if le:
                # Handle unseen categories
                df_encoded[col] = df[col].astype(str).fillna('Unknown')
                df_encoded[col] = df_encoded[col].apply(
                    lambda x: le.transform([x])[0] if x in le.classes_ else -1
                )
    
    # Fill missing numeric values
    for col in numeric_cols:
        if fit:
            median_val = df_encoded[col].median()
            df_encoded[col] = df_encoded[col].fillna(median_val)
            encoders[f'{col}_median'] = median_val
        else:
            median_val = encoders.get(f'{col}_median', 0)
            df_encoded[col] = df_encoded[col].fillna(median_val)
    
    # Scale numeric features
    if fit:
        scaler = StandardScaler()
        df_encoded[numeric_cols] = scaler.fit_transform(df_encoded[numeric_cols])
        encoders['scaler'] = scaler
    else:
        scaler = encoders.get('scaler')
        if scaler:
            df_encoded[numeric_cols] = scaler.transform(df_encoded[numeric_cols])
    
    return df_encoded, encoders


def process_lendingclub_data(csv_path: str = None, n_samples: int = None, 
                            n_features: int = 25, use_chunks: bool = True) -> Tuple[pd.DataFrame, pd.Series, List[str], dict]:
    """
    Main data processing pipeline.
    
    Returns:
        X: Feature matrix
        y: Target vector
        feature_names: List of feature names
        encoders: Dictionary of encoders for inference
    """
    # Load data in chunks if it's very large
    logger.info("Loading data...")
    try:
        # Try to get file size first
        import os
        file_path = csv_path or str(DATA_DIR / "archive" / "accepted_2007_to_2018q4.csv" / "accepted_2007_to_2018Q4.csv")
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
            logger.info(f"File size: {file_size:.1f} MB")
            
            # If file is large, use chunking
            if file_size > 500 and use_chunks:
                logger.info("Large file detected. Loading in chunks...")
                chunk_list = []
                chunk_size = 50000
                for chunk in pd.read_csv(file_path, chunksize=chunk_size, low_memory=False):
                    chunk_list.append(chunk)
                    if n_samples and len(pd.concat(chunk_list, ignore_index=True)) >= n_samples:
                        break
                df = pd.concat(chunk_list, ignore_index=True)
                if n_samples and len(df) > n_samples:
                    df = df.sample(n=n_samples, random_state=42)
            else:
                df = load_lendingclub_data(csv_path)
        else:
            df = load_lendingclub_data(csv_path)
    except Exception as e:
        logger.warning(f"Chunked loading failed: {e}. Using standard loading...")
        df = load_lendingclub_data(csv_path)
    
    # Sample if requested
    if n_samples and len(df) > n_samples:
        logger.info(f"Sampling {n_samples:,} rows...")
        df = df.sample(n=n_samples, random_state=42)
    
    # Clean data
    df = clean_data(df)
    
    # Create target
    target = create_target(df)
    
    # Remove rows with missing target
    df = df[target.notna()]
    target = target[target.notna()]
    
    # Select features
    feature_cols = select_features(df, target, n_features=n_features)
    
    # Encode features
    X, encoders = encode_features(df, feature_cols, fit=True)
    X.columns = feature_cols  # Ensure column names match
    
    logger.info(f"Final dataset: {len(X):,} samples, {len(feature_cols)} features")
    logger.info(f"Feature names: {feature_cols}")
    
    return X, target, feature_cols, encoders


if __name__ == "__main__":
    # Example usage
    try:
        X, y, feature_names, encoders = process_lendingclub_data(n_samples=1000000, n_features=25)
        
        # Save processed data
        X.to_csv(DATA_DIR / "X_processed.csv", index=False)
        y.to_csv(DATA_DIR / "y_processed.csv", index=False)
        
        import pickle
        with open(DATA_DIR / "encoders.pkl", "wb") as f:
            pickle.dump(encoders, f)
        
        with open(DATA_DIR / "feature_names.txt", "w") as f:
            f.write("\n".join(feature_names))
        
        logger.info("Data processing complete!")
        logger.info(f"Saved to {DATA_DIR}/")
        
    except FileNotFoundError as e:
        logger.error(str(e))
        logger.info("\nTo download the dataset:")
        logger.info("1. Visit https://www.kaggle.com/datasets/wordsforthewise/lending-club")
        logger.info("2. Download 'accepted_2007_to_2018Q4.csv'")
        logger.info(f"3. Place it in {DATA_DIR}/")

