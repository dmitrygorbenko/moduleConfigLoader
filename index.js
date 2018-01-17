
'use strict';

var
    _ = require("lodash"),
    fs = require("fs"),
    path = require("path");

function ConfigPlugin(options) {

    this.options = _.defaults(options, {
        verbose: false,
        modulesToImportAliasesFrom: []
    });
};

ConfigPlugin.prototype = _.extend(ConfigPlugin.prototype, {

    apply: function (compiler) {

        compiler.plugin("environment", function() {

            var
                aliasesOfThisModule,
                compiledAliasesList = {};

            this.logInfo("Merging aliases files from different modules if possible...");

            _.each(this.options.modulesToImportAliasesFrom, function (moduleName) {
                var
                    aliases,
                    moduleConfigFileName;

                moduleConfigFileName = path.normalize(compiler.options.context + "/bower_components/" + moduleName + "/config.js");

                aliases = this.readAliasesFromModule({
                    compiler: compiler,
                    moduleName: moduleName,
                    moduleConfigFileName: moduleConfigFileName
                });

                if (!aliases) {
                    return;
                }

                compiledAliasesList = _.extend(compiledAliasesList, aliases);

            }.bind(this));


            // now, get aliases from our own module
            aliasesOfThisModule = this.readAliasesFromModule({
                compiler: compiler,
                moduleName: this.options.thisModuleName,
                moduleConfigFileName: path.normalize(compiler.options.context + "/../config.js")
            });
            if (aliasesOfThisModule) {
                compiledAliasesList = _.extend(compiledAliasesList, aliasesOfThisModule);
            }


            //, now, put all read aliases back to webpack configuration
            compiler.options.resolve.alias = _.extend(compiledAliasesList, compiler.options.resolve.alias);

            if (this.options.verbose) {
                this.logInfo("\nCompiled webpack aliases are:\n", compiler.options.resolve.alias, "\n");
            }

        }.bind(this));
    },

    readAliasesFromModule: function (options) {

        var
            aliases = null,
            content,
            config,
            functToGetConfig,

            compiler = options.compiler,
            moduleName = options.moduleName,
            moduleConfigFileName = options.moduleConfigFileName;

        this.logInfo("Reading webpack aliases (config file is 'config.js') from module", moduleName);

        if (!fs.existsSync(moduleConfigFileName)) {
            this.logError("Config file from module '" + moduleName + "' doesn't exists: " + moduleConfigFileName);
            return aliases;
        }

        this.logInfo("... getting config data from " + moduleConfigFileName);

        content = fs.readFileSync(moduleConfigFileName);

        functToGetConfig = new Function("myFunc", "var\n" +
            "        config,\n" +
            "        requirejs = {\n" +
            "            config: function (config) {\n" +
            "                return config;\n" +
            "            }\n" +
            "        };\n" +
            "    \n" +
            "    config = " + content + " return config;")

        try {
            config = functToGetConfig();
        } catch (e) {
            this.logError("... failed to get config data from this file, please, check it");
            return aliases;
        }

        if (!config.webpackConfig) {
            return aliases;
        }

        if (config.webpackConfig.resolve) {
            if (config.webpackConfig.resolve.alias) {
                aliases = config.webpackConfig.resolve.alias;

                this.logInfo("... read", Object.keys(aliases).length, "alises");
            }
        }

        return aliases;
    },

    // instead of importing colors I used this article:
    // https://ourcodeworld.com/articles/read/298/how-to-show-colorful-messages-in-the-console-in-node-js
    logInfo: function () {

        var
            args = Array.prototype.slice.call(arguments);

        args.unshift("\x1b[1m\x1b[37m");
        args.push("\x1b[39m\x1b[22m");

        console.log.apply(console, args);
    },

    logError: function () {
        var
            args = Array.prototype.slice.call(arguments);

        args.unshift("\x1b[1m\x1b[31m");
        args.push("\x1b[39m\x1b[22m");

        console.log.apply(console, args);
    }
})

module.exports = ConfigPlugin;
