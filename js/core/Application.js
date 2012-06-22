define(["js/core/UIComponent", "js/core/History", "js/core/Bus"], function (UIComponent, History, Bus) {
        return UIComponent.inherit("js.core.Application", {
            $classAttributes: [/.+/],
            ctor: function () {
                this.history = new History();

                this.callBase();
            },

            initialize: function () {
                // set up application wide vars
                this.callBase();
            },

            _inject: function () {
                // overwrite and call inside start
            },

            _initializeDescriptors: function () {
                this.callBase();
                UIComponent.prototype._inject.call(this);
            },

            /**
             * Method called, when application is initialized
             *
             * @param {Object} parameter
             * @param {Function} callback
             */
            start: function (parameter, callback) {
                parameter = parameter || {};
                this.$systemManager.$parameter = parameter;
                this.startHistory(callback, parameter.initialHash);
            },

            startHistory: function(callback, initialHash) {
                this.history.start(callback, initialHash);
            },

            render: function (target) {
                var dom = this.callBase(target);

                this.$systemManager.$bus.trigger('Application.Rendered');

                return dom;
            },
            toString: function () {
                return "js.core.Application";
            }
        });
    }
);