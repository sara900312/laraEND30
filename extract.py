#!/usr/bin/env python3
import zipfile
import sys
import os

# Extract zip file to current directory
with zipfile.ZipFile('A47/A203.zip', 'r') as zip_ref:
    zip_ref.extractall('.')

print("Extraction complete")
