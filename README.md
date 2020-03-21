# PheGET

**PheGET**: Phenotype / Gene-Expression-Tissue Browser

Visualize and query eQTL data in various ways

## Development instructions
This app can be installed and run on your local machine. It uses PySAM, and therefore may not install on Windows.

### Setup
This code was written and tested against **Python 3.6-3.7**. We highly recommend developing in a virtual environment, 
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

For a development instance, you will also need to install additional dependencies:
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

Flask powers the backend. The frontend uses Vue.js, and you will need to start the Vue CLI development server 
(in a separate terminal) in order to make UI changes. This will cause your HTML to continuously rebuild, making it 
easier to modify the code for your site:
`$ npm run serve`

Then follow the instructions printed to the vue-server console, to visit the app in your web browser. You should visit 
the URL specified by Vue (not flask): in development, the vue server will proxy requests to flask for a seamless
 experience.

### Additional production options
You may configure Sentry error monitoring by setting the config option `SENTRY_DSN` in your `.env` file.

### Testing and code quality
Before any commit, please run the following commands. (a sample pre-commit hook is provided that will do this for you,
 automatically)
 
These commands will perform static analysis to catch common bugs, and auto-format your code in a way intended to 
 reduce merge conflicts due to formatting issues. (so that you won't have to satisfy the linter manually)

```bash
$ fourmat fix
$ eslint . --fix
$ mypy .
$ pytest .
$ npm run test:unit
```

The linting commands are run on every commit, and can be triggered manually via: `pre-commit run --all-files`.

Because unit tests can be more complex, these must be run separately (or during the CI step). Mostly, we separate this 
  step to avoid making commits slow.
