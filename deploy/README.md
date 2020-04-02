# Deployment instructions

This app is deployed using gunicorn and a reverse proxy. Sample files are provided in this folder.

You will need to read them carefully, and update paths as appropriate.

## First time setup steps
1. Follow the setup instructions in the README to check out the code and create a virtual environment.  
    * Note that some distros (such as Ubuntu 16.04 LTS) may come with an older Python version by default, but 
    Python >=3.6 is required.
2. Make sure to populate a settings file  (`.env`) in the code directory with the required information. For production,
    acquire a copy of the processed eQTL data and update your `.env` file to point to it.
3. Activate the virtual environment and install dependencies: `source .venv/bin/activate && pip install -r requirements/prod.txt`
4. Update the paths in `pheget.service` to point at your application folder and follow the instructions in that file
    to activate this as a systemd service
5. Check that the site is hosted on port 8877 by running `curl http://localhost:8877`.
6. Copy `sample-apache-https.conf` to `/etc/apache2/sites-available/002-pheget.conf` and update the domain name 
    (and `DocumentRoot`) to match your environment. Make sure to grant permissions to the `dist` folder.
    - Build the static JS assets by running `npm install && npm run build`. The apache config file should point to 
        the resulting `dist/` file as the new `DocumentRoot`. 
    - Run `sudo a2enmod headers proxy proxy_http rewrite`
    - Activate the new configuration using `sudo a2ensite 002-pheget.conf && sudo service apache2 reload`   
7. Enable HTTPS using LetsEncrypt:
    - Follow the instructions to create an SSL certificate using [LetsEncrypt](https://certbot.eff.org/), 
        installing the certificate with `sudo certbot --apache`.
    - Test the site in your browser.


## Subsequent deployments
Once your app is configured, you can use the provided script `./deploy.sh` to run all the required steps. 
This must be run from the project root folder, by a user with write access to all directories. 
The static asset folder in the script should match your apache configuration (eg `/var/www/pheget`) and you should 
have write access.
