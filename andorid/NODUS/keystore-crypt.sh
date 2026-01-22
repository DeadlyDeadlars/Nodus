#!/bin/bash
# Encrypt/decrypt keystore.properties for secure storage

KEYSTORE_FILE="android/keystore.properties"
ENCRYPTED_FILE="android/keystore.properties.enc"

encrypt() {
    if [ ! -f "$KEYSTORE_FILE" ]; then
        echo "Error: $KEYSTORE_FILE not found"
        exit 1
    fi
    
    read -sp "Enter encryption password: " PASSWORD
    echo
    
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$KEYSTORE_FILE" -out "$ENCRYPTED_FILE" -pass pass:"$PASSWORD"
    
    if [ $? -eq 0 ]; then
        echo "✓ Encrypted to $ENCRYPTED_FILE"
        echo "✓ You can now safely delete $KEYSTORE_FILE"
        echo "  Run: rm $KEYSTORE_FILE"
    fi
}

decrypt() {
    if [ ! -f "$ENCRYPTED_FILE" ]; then
        echo "Error: $ENCRYPTED_FILE not found"
        exit 1
    fi
    
    read -sp "Enter decryption password: " PASSWORD
    echo
    
    openssl enc -aes-256-cbc -d -pbkdf2 -in "$ENCRYPTED_FILE" -out "$KEYSTORE_FILE" -pass pass:"$PASSWORD"
    
    if [ $? -eq 0 ]; then
        echo "✓ Decrypted to $KEYSTORE_FILE"
    else
        echo "✗ Decryption failed (wrong password?)"
        rm -f "$KEYSTORE_FILE"
        exit 1
    fi
}

case "$1" in
    encrypt|enc|e)
        encrypt
        ;;
    decrypt|dec|d)
        decrypt
        ;;
    *)
        echo "Usage: $0 {encrypt|decrypt}"
        echo "  encrypt - Encrypt keystore.properties"
        echo "  decrypt - Decrypt keystore.properties for building"
        exit 1
        ;;
esac
