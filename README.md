# PheGET

**PheGET**: Phenotype / Gene-Expression-Tissue Browser

Visualize and query eQTL data in various ways

## Development instructions
This app can be installed and run on your local machine. It uses PySAM, and therefore may not install on Windows.

### Setup
This code was written and tested against Python 3.6-3.7. We highly recommend developing in a virtual environment, 
    created using your tool of choice (many IDEs can create and manage the virtualenv for you). For the most basic use:

`$ python3 -m virtualenv venv`

Then activate the virtual environment (which must be done in every command line/terminal session):
`$ source venv/bin/activate/`


Install dependencies (within your virtual environment), and activate pre-commit hooks for easier development:
```bash
$ pip3 install -r requirements/dev.txt
$ pre-commit install
$ pre-commit install-hooks
```

For a development instance, you may wish to install additional dependencies:
```bash
$ pip3 install -r requirements/dev.txt
$ npm install --dev
```

### Source data
For the prototype, source data will live in the folder `data/`. Really large files should not be checked into github, 
    so you will need to download them separately for your environment.

To change settings specific to an individual machine (such as the data directory), edit the contents of `.env` 
in the root directory of your project. A `.env-sample` file is provided as a template.


### Running the development server
Make sure to activate your virtualenv at the start of every new terminal session: `$ source venv/bin/activate` 

The following command will start a basic flask app server that reloads whenever code is changed:
`$ ./run-development.sh`

Then follow the instructions printed to the console to visit the app in your web browser.


### Testing and code quality
Before any commit, please run the following commands. (a sample pre-commit hook is provided that will do this for you,
 automatically)
 
These commands will perform static analysis to catch common bugs, and auto-format your code in a way intended to 
 reduce merge conflicts due to formatting issues. (so that you won't have to satisfy the linter manually)

```bash
$ fourmat fix
$ eslint . --fix
$ mypy .
```

(This is roughly equivalent to `pre-commit run --all-files`)
