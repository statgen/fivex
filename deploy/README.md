# Deployment instructions

This app is deployed using gunicorn and a reverse proxy. Sample files are provided in this folder.

You will need to read them carefully, and update paths as appropriate.

## Steps (test these in practice)
1. Follow the setup instructions in the README to check out the code and create a virtual environment
2. Activate the virtual environment and install dependencies: `pip install -r requirements/prod.txt`
3. Update the paths in `pheget.service` to point at your application folder and follow the instructions in that file
    to activate this as a systemd service
4. Update the sample apache configuration to point at your server, and add it to `/etc/apache2/sites-available/001-pheget.conf`
    - Activate the new configuration using `sudo a2ensite 001-pheget.conf && sudo service apache2 reload`
    - Follow the instructions to create an SSL certificate using [LetsEncrypt](https://certbot.eff.org/).
5. Test the site in your browser.
