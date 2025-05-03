
import os
import csv
import json
import time
import argparse
from typing import List, Dict, Any, Optional
import requests
import openai

# Configuration
OPENAI_API_KEY = "your-openai-api-key"  # Replace with your actual API key
SUPABASE_URL = "https://vfzzjnpkqbljhfdbbrqn.supabase.co"
SUPABASE_KEY = "your-supabase-key"  # Replace with your actual API key

class VendorExtractor:
    def __init__(self, api_key: str, supabase_url: str, supabase_key: str):
        """Initialize the VendorExtractor with API keys."""
        self.api_key = api_key
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        openai.api_key = api_key
        
        # Headers for Supabase API calls
        self.headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # Cache for vendor categorizations to minimize API calls
        self.vendor_cache = {}
        
    def read_csv(self, file_path: str) -> List[Dict[str, Any]]:
        """Read a CSV file and return a list of dictionaries."""
        transactions = []
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Handle amount conversion
                if 'amount' in row:
                    try:
                        row['amount'] = float(row['amount'])
                    except (ValueError, TypeError):
                        row['amount'] = 0.0
                
                # Ensure date is formatted correctly
                if 'date' in row and not row['date']:
                    row['date'] = None
                    
                transactions.append(row)
        
        print(f"Read {len(transactions)} transactions from {file_path}")
        return transactions
    
    def get_existing_vendors(self) -> List[str]:
        """Get a list of existing vendor names from the database."""
        try:
            response = requests.get(
                f"{self.supabase_url}/rest/v1/vendor_categorizations?select=vendor_name",
                headers=self.headers
            )
            response.raise_for_status()
            vendors = response.json()
            return [v["vendor_name"] for v in vendors]
        except Exception as e:
            print(f"Error getting existing vendors: {e}")
            return []
    
    def extract_vendor(self, description: str, existing_vendors: List[str]) -> Dict[str, Any]:
        """Extract vendor information using OpenAI."""
        # Check cache first
        cache_key = description.lower()
        if cache_key in self.vendor_cache:
            return self.vendor_cache[cache_key]
        
        try:
            system_prompt = (
                "You are an AI assistant specializing in financial vendor extraction. "
                "Given a bank transaction description, identify the vendor name and suggest "
                "a category for this transaction. Extract only the main business or vendor name "
                "from the description, excluding any transaction references, dates, or other metadata."
            )
            
            if existing_vendors:
                vendor_examples = ", ".join(existing_vendors[:20])
                system_prompt += f"\n\nKnown vendors (use these if the transaction appears to be from one of them): {vendor_examples}"
            
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Transaction description: \"{description}\""}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Add to cache
            self.vendor_cache[cache_key] = {
                "vendor": result.get("vendor", "Unknown"),
                "category": result.get("category"),
                "type": result.get("type", "expense"),
                "statementType": result.get("statementType", "profit_loss"),
                "confidence": result.get("confidence", 0.7)
            }
            
            return self.vendor_cache[cache_key]
        
        except Exception as e:
            print(f"Error extracting vendor for '{description}': {e}")
            return {
                "vendor": "Unknown",
                "category": None,
                "type": "expense",
                "statementType": "profit_loss",
                "confidence": 0.3
            }
    
    def process_transactions(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process transactions to extract and assign vendor information."""
        print("Processing transactions...")
        existing_vendors = self.get_existing_vendors()
        print(f"Found {len(existing_vendors)} existing vendors")
        
        processed = []
        for i, transaction in enumerate(transactions):
            if "description" not in transaction or not transaction["description"]:
                processed.append(transaction)
                continue
                
            description = transaction["description"]
            
            # Skip if transaction already has a verified vendor
            if transaction.get("vendor") and transaction.get("vendorVerified"):
                processed.append(transaction)
                continue
                
            # Extract vendor information
            vendor_info = self.extract_vendor(description, existing_vendors)
            
            # Update transaction with vendor information
            transaction["vendor"] = vendor_info["vendor"]
            if not transaction.get("category"):
                transaction["category"] = vendor_info["category"]
            if not transaction.get("type"):
                transaction["type"] = vendor_info["type"]
            if not transaction.get("statementType"):
                transaction["statementType"] = vendor_info["statementType"]
            transaction["confidenceScore"] = vendor_info["confidence"]
            
            processed.append(transaction)
            
            # Print progress
            if (i + 1) % 10 == 0:
                print(f"Processed {i + 1}/{len(transactions)} transactions")
            
            # Add a small delay to avoid rate limiting
            time.sleep(0.1)
        
        return processed
    
    def upload_to_supabase(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Upload processed transactions to Supabase."""
        print("Uploading transactions to Supabase...")
        
        # Transform transactions to match the database schema
        records = []
        for txn in transactions:
            record = {
                "description": txn.get("description", ""),
                "amount": txn.get("amount", 0),
                "date": txn.get("date"),
                "category": txn.get("category"),
                "type": txn.get("type"),
                "statement_type": txn.get("statementType"),
                "vendor": txn.get("vendor"),
                "vendor_verified": txn.get("vendorVerified", False),
                "confidence_score": txn.get("confidenceScore"),
                "is_verified": txn.get("isVerified", False),
                "bank_connection_id": txn.get("bankAccountId"),
                "balance": txn.get("balance"),
                "account_id": txn.get("accountId") or txn.get("bankAccountId")
            }
            records.append(record)
        
        # Upload in batches
        batch_size = 20
        batches = [records[i:i + batch_size] for i in range(0, len(records), batch_size)]
        
        results = {
            "success": 0,
            "failed": 0,
            "errors": []
        }
        
        for i, batch in enumerate(batches):
            try:
                response = requests.post(
                    f"{self.supabase_url}/rest/v1/bank_transactions",
                    headers=self.headers,
                    json=batch
                )
                response.raise_for_status()
                results["success"] += len(batch)
                print(f"Uploaded batch {i+1}/{len(batches)}")
            except Exception as e:
                results["failed"] += len(batch)
                results["errors"].append(str(e))
                print(f"Error uploading batch {i+1}: {e}")
        
        # Generate embeddings for the uploaded transactions
        self.generate_embeddings()
        
        return results
    
    def generate_embeddings(self) -> None:
        """Generate embeddings for transactions without them."""
        try:
            # Call the generate-embeddings function
            response = requests.post(
                f"{self.supabase_url}/functions/v1/generate-embeddings",
                headers=self.headers,
                json={
                    "table": "bank_transactions",
                    "textField": "description",
                    "limit": 50
                }
            )
            response.raise_for_status()
            result = response.json()
            print(f"Generated embeddings: {result.get('results', {}).get('success', 0)} successful")
        except Exception as e:
            print(f"Error generating embeddings: {e}")
    
    def main(self, file_path: str) -> None:
        """Main process: read CSV, extract vendors, and upload to Supabase."""
        # Read CSV file
        transactions = self.read_csv(file_path)
        
        # Process transactions to extract vendor information
        processed_transactions = self.process_transactions(transactions)
        
        # Upload to Supabase
        result = self.upload_to_supabase(processed_transactions)
        
        print(f"\nResults:")
        print(f"Successfully uploaded: {result['success']} transactions")
        print(f"Failed to upload: {result['failed']} transactions")
        if result["errors"]:
            print(f"Errors: {result['errors']}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process bank transactions CSV and extract vendor information")
    parser.add_argument("file", help="Path to the CSV file containing transactions")
    parser.add_argument("--api-key", help="OpenAI API key")
    parser.add_argument("--supabase-url", help="Supabase URL")
    parser.add_argument("--supabase-key", help="Supabase API key")
    
    args = parser.parse_args()
    
    # Use command line arguments or environment variables or defaults
    api_key = args.api_key or os.getenv("OPENAI_API_KEY") or OPENAI_API_KEY
    supabase_url = args.supabase_url or os.getenv("SUPABASE_URL") or SUPABASE_URL
    supabase_key = args.supabase_key or os.getenv("SUPABASE_KEY") or SUPABASE_KEY
    
    extractor = VendorExtractor(api_key, supabase_url, supabase_key)
    extractor.main(args.file)
