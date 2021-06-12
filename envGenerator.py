import secrets, base64, re

try:
    f = open(".env", "x")
except:
    new_file = input(".env File already exists, you you want to override it? [y/n] ")
    if new_file == "y":
        f = open(".env", "w")
    else:
        exit()

print(" * * * * * * * * * *  Generating .env File  * * * * * * * * * *")
print(" *")
print(" * [1/7] setting 'NODE_ENV' to 'production'")
f.write("NODE_ENV=production\n")
print(" *")

print(" *   The SESSION_SECRET is used to compute the hash of existing User-Sessions, therefore preventing Session-Hijacking.")
print(" *   These Sessions are an important feature of this application to keep trace of authenticated connections.")
sess_secret = input(" *   - do you want to set the session secret manually? [y/n] ")
if sess_secret == "y":
    sess_secret = input(" *    Please provide a random string: ")
else:
    sess_secret = secrets.token_hex(16)
print(" *")
print(" * [2/7] setting 'SESSION_SECRET' to '" + sess_secret + "'")
f.write("SESSION_SECRET=" + sess_secret + "\n")
print(" * ")

print(" *   The DATA_ENCRYPTION_KEY is used to encrypt password protected database entries (password protected rooms). Due to the")
print(" *   ORM Waterline of Sails.js this key should be a 32byte long string encoded in Base64.")
enc_key = input(" *   - do you want to set the data encryption key manually? [y/n] ")
if enc_key == "y":
    while 1:
        enc_key = input(" *    Please provide a 32byte string: ")
        if len(enc_key) == 32: break
    enc_key = base64.b64encode(bytes(enc_key, 'utf-8')).decode('utf-8')
else:
    enc_key = base64.b64encode(secrets.token_bytes(32)).decode('utf-8')
print(" *")
print(" * [3/7] setting 'DATA_ENCRYPTION_KEY' to '" + enc_key + "'")
f.write("DATA_ENCRYPTION_KEY=" + enc_key + "\n")
print(" *")

print(" *   You can provide a password and a username to restrict access to the MongoDB database running in its separate container.")
print(" *   This is not really needed, but it can be provided nevertheless.")
print(" *   If you provide MongoDB credentials please make sure to only provide !_URL-SAFE_! strings.")
mongo_pw = input(" *   - do you want to add authentication for MongoDB? [y/n] ")
if mongo_pw == "y":
    mongo_pw = input(" *   - do you want to set it manually? [y/n] ")
    if mongo_pw == "y":
        reg = re.compile("[^a-z0-9A-Z._~-]+")
        while 1:
            mongo_un = input(" *    Please provide a !_URL-SAFE_! username: ")
            if not reg.search(mongo_un): break
        while 1:
            mongo_pw = input(" *    Please provide a !_URL-SAFE_! password: ")
            if not reg.search(mongo_pw): break
    else:
        mongo_pw = secrets.token_urlsafe(8)
        mongo_un = "root"
else:
    mongo_pw = ""
print(" *")
print(" * [4/7] setting 'MONGO_USER' to '" + mongo_un + "'")
print(" * [4/7] setting 'MONGO_PASSWORD' to '" + mongo_pw + "'")
f.write("MONGO_USER=" + mongo_un + "\n")
f.write("MONGO_PASSWORD=" + mongo_pw + "\n")
print(" *")

print(" *   Please provide the Domain name of the server this application will be running on. This is essential because socket")
print(" *   connections will only be accepted from this domain. If you want to serve this application on mutliple domains, please")
print(" *   edit the production.js file in './config/env/production.js' by adding your domains to the 'onlyAllowOrigins' list in the")
print(" *   sockets-section. If you don't own a domain name, just provide the public IP of the server.")
print(" *   Domains should be provided with their used protocol (http/https), eg: 'https://www.example.com' or 'http://174.45.20.4'")
dom_name = input(" *   - Please provide your domain name: ")
print(" *")
print(" * [5/7] setting trusted 'DOMAIN_NAME' to '" + dom_name +"'")
f.write("DOMAIN_NAME=" + dom_name + "\n")
print(" * ")

print(" *   On what Port do you want to serve this application globally? The default Port for web-applications would be 80.")
print(" *   Note: When running the application you will always see 'Port: 80' in the logs, but this only refers to the internal Port")
print(" *   used by the docker container. This Port will be mapped to your specified Port accordingly.")
port = input(" *   - Port: ")
print(" *")
print(" * [6/7] setting 'SERVED_PORT' to " + port)
f.write("SERVED_PORT=" + port + "\n")
print(" *")

print(" *   Does your Domain own a SSL/TLS certificate? If so, you can enable SSL/TLS to serve this application over the encrypted")
print(" *   https standard instead of http.")
print(" *   Note: if you want to deploy this application on your own personal server you will most likey have to perform some")
print(" *   additional tasks as setting up a reverse Proxy like nginx to serve this application over https. We only tried deployment")
print(" *   on Heroku as we don't own a private Server and as a PaaS Heroku handles such things as load balancing and SSL certificates.")
ssl_enable = input(" *   - do you want to add SSL/TLS support? [y/n] ")
print(" *")
if ssl_enable == "y":
    print(" * [7/7] enabling SSL/TLS support")
    f.write("SSL_ENABLE=True\n")
else:
    print(" * [7/7] omitting SSL/TLS support")
print(" *")
print(" * * * * * * * * * *  Setup complete  * * * * * * * * * *")
print("")
print(" You should now be able to run the application with 'docker-compose build' and 'docker-compose up' afterwards. Have fun!")
print(" PS: To launch the application in the background, you can use 'docker-compose up -d' instead after building.")
print("     To stop the application if its running in foreground you can press 'CTRL + C' but you should still bring it down")
print("     with 'docker-compose down' as you also should if it's running in background.")

f.close()


