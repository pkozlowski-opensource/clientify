## Installation

`sudo npm install -g clientify`

## Usage

In a project using npm modules and having a valid `package.json`:

* `npm install`
* `clientify`

Running this command will:
* analyse dependency tree of the *installed* npm modules
* try to "flatten" the dependency tree by applying the following algorithm:
    * find all the duplicates of a given module in the dependency tree
    * check if there are versions satisfying all the dependency ranges for modules that depend on a given module
    * take the latest dependency of a given module if all ranges are satisfied
    * if there is no installed version matching all the ranges report an error
* flattened modules are copied to the `browser_modules` folder

## Caveats

This is very early alpha, use at your own risk (but please _do_ contribute!). It won't mess up your
`node_modules` folder, but can produce less than accurate results in the `browser_modules` folder.

At the moment the known conditions where it won't work properly are:
* operating it on the `node_modules` folder after running `npm dedupe`
* it might happen (?) that none of the installed versions satisfies all the version ranges, while a module that would satisfy all the ranges exists in the npm repo - atm it won't be downloaded
* `npm-shrinkwrap.json` is not taken into account
* there are number of corner cases where error reporting is next to null

## Backlog

* Decide with caveats should be addressed
* Make it work with the dedupped node_modules
* Better error reporting / corner cases handling
* Investigate possibility to run this command automatically after npm install / npm update
* Pretty output (success / errors)
* Customizable filtering of copied modules and their content
