define(["js/core/Bindable", "underscore"], function (Bindable, _) {

        var undefined,
            prefixMap = {
                "type:eventHandler": "eventHandler:",
                "type:function": "function:"
            };

        function stringToPrimitive(str) {
            // if it's a string
            if (str && _.isString(str)) {

                var num = Number(str);
                if (!isNaN(num)) {
                    return num;
                }

                if (str === "true") {
                    return true;
                } else if (str === "false") {
                    return false;
                }

                if (str === "null") {
                    return null;
                }
            }
            return str;
        }

        var Element = Bindable.inherit("js.core.Element", {
            ctor: function (attributes, descriptor, stage, parentScope, rootScope) {
                attributes = attributes || {};

                if (!descriptor) {
                    // created from node
                    if (!rootScope) {
                        rootScope = this;
                    }
                }
                this.$stage = stage;
                this.$descriptor = descriptor;
                this.$parentScope = parentScope || null;
                this.$rootScope = rootScope || null;
                this.$attributesNamespace = this.$attributesNamespace || {};

                this.callBase(attributes);

                this._initializeAttributes(this.$);

                // manually constructed
                if (descriptor === undefined || descriptor === null) {
                    this._initialize(this.$creationPolicy);
                }

            },

            _getAttributesFromDescriptor: function (descriptor, rootScope) {

                this.$attributesNamespace = this.$attributesNamespace || {};

                var attributes = {};

                if (descriptor && descriptor.attributes) {
                    var node, localName;

                    for (var a = 0; a < descriptor.attributes.length; a++) {
                        node = descriptor.attributes[a];
                        // don't add xmlns attributes
                        if(node.nodeName.indexOf("xmlns") !== 0){
                            localName = this._getLocalNameFromNode(node);

                            var prefix = prefixMap[node.namespaceURI],
                                handled = false;

                            if (prefix === "function:") {
                                var fnc = rootScope[node.value];
                                if (!fnc) {
                                    throw new Error("Cannot find referenced function '" + node.value + "' in scope.");
                                }

                                attributes[localName] = fnc;
                                handled = true;
                            } else if (prefix) {
                                localName = prefix + localName;
                            }

                            if (!handled) {
                                attributes[localName] = stringToPrimitive(node.value);
                            }

                            if (node.namespaceURI) {
                                this.$attributesNamespace[localName] = node.namespaceURI;
                            }

                        }

                    }
                }

                return attributes;
            },
            _getLocalNameFromNode: function(node){
                return node.localName ? node.localName : node.nodeName.split(":").pop();
            },

            defaults: {
                /**
                 * Decides if the initialization of the component is started automatically or manually by the application
                 * @type String
                 */
                creationPolicy: "auto"
            },
            _initializeEventAttributes: function(attribute){

            },
            _initializeAttributes: function (attributes) {
            },

            _initializeDescriptors: function () {
            },

            /**
             *
             * @param creationPolicy
             *          auto - do not overwrite (default),
             *          all - create all children
             *          TODO none?
             */
            _initialize: function (creationPolicy, withBindings) {
                if (this.$initialized) {
                    return;
                }

                this.$initializing = true;

                this._preinitialize();

                this.initialize();

                this._initializeDescriptors();

                this._initializeEventAttributes(this.$);

                if (this === this.$rootScope || (this.$parentScope && this.$parentScope.$initialized) || this.$descriptor === false) {
                    this._initializeBindings();
                }

            },

            _initializeFromCtor: function () {
                // don't callBase() here, because initialization is made after all components in XAML are
                // available or component is the root scope. See 8 lines above.
            },

            find: function (key) {
                var scope = this.getScopeForKey(key);
                if (this === scope) {
                    return this.get(key);
                } else if (scope != null) {
                    return scope.get(key);
                } else {
                    return null;
                }
            },

            _preinitialize: function () {

            },

            _getTextContentFromDescriptor: function (desc) {
                var textContent = desc.textContent || desc.nodeValue || desc.data || desc.text;
                if (!textContent) {
                    textContent = "";
                    for (var i = 0; i < desc.childNodes.length; i++) {
                        var node = desc.childNodes[i];
                        // element or cdata node
                        if (node.nodeType == 1 || node.nodeType == 4) {
                            textContent += this._getTextContentFromDescriptor(node);
                        }
                    }
                }
                return textContent;
            },
            /**
             * Binding helper to negate a Boolean value
             * @param value
             * @return {Boolean}
             */
            not: function(value){
                return !value;
            },
            isDefined: function(value){
                return !_.isUndefined(value);
            }
        });

        Element.xmlStringToDom = function(xmlString) {

            if (window && window.DOMParser) {
                return (new DOMParser()).parseFromString(xmlString, "text/xml").documentElement;
            } else if (typeof(ActiveXObject) !== "undefined") {
                var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = false;
                xmlDoc.loadXML(xmlString);
                return xmlDoc.documentElement;
            } else {
                throw "Couldn't parse xml string";
            }


        };

        return Element;
    }
);