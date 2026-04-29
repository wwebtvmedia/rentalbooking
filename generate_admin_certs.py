import os
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12

def generate_certs():
    password = os.environ.get("ADMIN_P12_PASSWORD") or os.urandom(18).hex()
    # 1. Generate Root CA Key
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    
    # 2. Generate Root CA Certificate
    ca_subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"bestflats.vip Root CA"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"bestflats.vip"),
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"FR"),
    ])
    
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_subject)
        .issuer_name(ca_subject)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=3650)) # 10 years
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(ca_key, hashes.SHA256())
    )

    # 3. Generate Admin Client Key
    client_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    
    # 4. Generate Admin Client Certificate Signed by CA
    client_subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"Platform Admin"),
        x509.NameAttribute(NameOID.USER_ID, u"admin-001"),
    ])
    
    client_cert = (
        x509.CertificateBuilder()
        .subject_name(client_subject)
        .issuer_name(ca_subject)
        .public_key(client_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=365)) # 1 year
        .sign(ca_key, hashes.SHA256())
    )

    # 5. Save Files
    os.makedirs("certs", exist_ok=True)
    
    with open("certs/ca.crt", "wb") as f:
        f.write(ca_cert.public_bytes(serialization.Encoding.PEM))
        
    with open("certs/admin.crt", "wb") as f:
        f.write(client_cert.public_bytes(serialization.Encoding.PEM))

    # 6. Create PKCS12 for Browser (contains cert and private key)
    # This is what you actually double-click to install in Chrome/Safari/Firefox
    p12_data = pkcs12.serialize_key_and_certificates(
        name=b"bestflats-admin",
        key=client_key,
        cert=client_cert,
        cas=[ca_cert],
        encryption_algorithm=serialization.BestAvailableEncryption(password.encode("utf-8"))
    )
    
    with open("certs/admin_bundle.p12", "wb") as f:
        f.write(p12_data)

    print("✅ Certificates generated successfully in /certs folder.")
    print("📁 ca.crt: The public CA certificate (Upload this to Cloudflare)")
    print(f"📁 admin_bundle.p12: Install this in your browser. Password: {password}")

if __name__ == "__main__":
    generate_certs()
