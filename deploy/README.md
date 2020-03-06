# Deployment instructions

This app is deployed using gunicorn and a reverse proxy. Sample files are provided in this folder.

You will need to read them carefully, and update paths as appropriate.

## Steps
1. Follow the setup instructions in the README to check out the code and create a virtual environment.
2. Activate the virtual environment and install dependencies: `pip install -r requirements/prod.txt`
3. Update the paths in `pheget.service` to point at your application folder and follow the instructions in that file
    to activate this as a systemd service
4. Check that the site is hosted on port 8877 by running `curl http://localhost:8877`.
5. Copy `sample-apache-without-ssl.conf` to `/etc/apache2/sites-available/pheget.conf` and update the domain name 
    (and `DocumentRoot`) to match your environment.
    - Build the static JS assets by running `npm install && npm run build`. The apache config file should point to 
        the resulting `dist/` file as the new `DocumentRoot`. 
    - Run `sudo a2enmod headers proxy proxy_http rewrite`
    - Activate the new configuration using `sudo a2ensite pheget.conf && sudo service apache2 reload`
    - Test the site in your browser.
6. Enable HTTPS using LetsEncrypt:
    - Follow the instructions to create an SSL certificate using [LetsEncrypt](https://certbot.eff.org/), installing the certificate with `sudo certbot --apache`.
    - Modify `/etc/apache2/sites-available/pheget.conf` and `/etc/apache2/sites-available/pheget-ls-ssl.conf` to match `sample-apache-https.conf`.
    - Test the site in your browser.
