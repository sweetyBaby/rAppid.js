define(['require', "js/core/List", "js/data/Model", "flow", "underscore"], function (require, List, Model, flow, _) {

    var State = {
        CREATED: 0,
        LOADING: 1,
        LOADED: 2,
        ERROR: -1
    };

    var Collection = List.inherit("js.data.Collection", {

        $modelFactory: Model,

        ctor: function (items, options) {

            options = options || {};

            this.callBase(items);

            _.defaults(options, {
                rootCollection: null,
                pageSize: null,
                queryParameters: {},
                factory: this.$modelFactory || require('js/data/Model'),
                type: null,
                $itemsCount: null
            });

            this.$queryCollectionsCache = {};
            this.$pageCache = [];
            this.$options = options;
        },

        getRootCollection: function () {
            return this.$options.rootCollection ? this.$options.rootCollection : this;
        },

        createQueryCacheKey: function (queryParameters) {
            queryParameters = queryParameters || {};
            var ret = [];

            for (var key in queryParameters) {
                if (queryParameters.hasOwnProperty(key)) {
                    ret.push(key + "=" + queryParameters[key]);
                }
            }

            ret.sort();

            if (ret.length == 0) {
                return "root";
            }

            return ret.join("&");
        },

        createQueryCollection: function (queryParameters) {

            var options = {
                queryParameters: queryParameters,
                rootCollection: this.getRootCollection()
            };

            // different queryParameter, same options
            _.defaults(options, this.$options);

            var cacheKey = this.createQueryCacheKey(queryParameters);
            if(!this.$queryCollectionsCache[cacheKey]){
                var collection = new Collection(null, options);
                collection.$context = this.$context;
                this.$queryCollectionsCache[cacheKey] = collection;
            }
            return this.$queryCollectionsCache[cacheKey];
        },

        // fetches the complete list
        fetch: function (options, callback) {
            options = options || {};

            var self = this;

            function fetchPages(pageCount) {
                var delegates = [];

                function addFetchPageDelegate(pageIndex) {
                    delegates.push(function (cb) {
                        self.fetchPage(pageIndex, options, cb);
                    });
                }

                for (var i = 0; i < pageCount; i++) {
                    addFetchPageDelegate(i);
                }

                // execute loading parallel
                flow()
                    .par(delegates)
                    .exec(function (err) {
                        if (callback) {
                            callback(err, self);
                        }
                    });
            }

            if (!this.$options.pageSize) {
                // unlimited pageSize -> create one and only page and fetch
                this.fetchPage(0, options, callback);
            } else {
                // determinate pages
                var pageCount = this.pageCount();

                if (!isNaN(pageCount)) {
                    // we know how many page are there
                    fetchPages(pageCount);
                } else {
                    // load first page in order to get the available itemCount
                    // to calculate the pageCount
                    this.fetchPage(0, options, function (err) {
                        if (!err) {
                            // we now should calculate a page count
                            pageCount = self.pageCount();

                            if (isNaN(pageCount)) {
                                if (callback) {
                                    callback("Count for collection couldn't be fetched.", self);
                                }
                            } else {
                                fetchPages(pageCount);
                            }
                        } else {
                            if (callback) {
                                callback(err, self);
                            }
                        }
                    })
                }
            }

        },

        pageCount: function () {
            if (this.$.hasOwnProperty("$itemsCount")) {
                return Math.ceil(this.$.$itemsCount / this.$options.pageSize);
            } else {
                // we actually don't know how many pages there will be
                return NaN;
            }
        },

        getContextForChild: function(childFactory) {
            return this.$context;
        },

        parse: function(data) {
            return data;
        },

        createItem: function(id) {
            return this.getContextForChild(this.$modelFactory).createEntity(this.$modelFactory, id);
        },

        fetchPage: function (pageIndex, options, callback) {

            if (pageIndex < 0) {
                throw "pageIndex must be >= 0";
            }

            var page = this.$pageCache[pageIndex];
            if (!page) {
                page = this.$pageCache[pageIndex] = new Page(null, this, pageIndex);
            }

            var self = this;
            options = _.extend(this.$options, options);
            page.fetch(options, function (err, page) {
                // insert data into items if not already inserted
                if (!err && !page.itemsInsertedIntoCollection) {
                    page.itemsInsertedIntoCollection = true;

                    // add items to collection
                    self.add(page.$items, {
                        index: (pageIndex || 0) * self.$options.pageSize
                    });
                }

                if (callback) {
                    callback(err, page, options);
                }
            });
        },

        // returns a new collections
        find: function (parameters) {
            var queryKey = this.createQueryCacheKey(parameters);

            if (!this.$queryCollectionsCache.hasOwnProperty(queryKey)) {
                this.$queryCollectionsCache[queryKey] = this.createQueryCollection(parameters);
            }

            return this.$queryCollectionsCache[queryKey];
        },

        size: function() {
            return this.$.$itemsCount;
        }.onChange('$itemsCount'),

        getQueryParameters: function(method){
            return this.$options.queryParameters;
        }
    });

    var Page = Collection.Page = List.inherit({

        ctor: function (items, collection, pageIndex) {
            if (!collection.$options.pageSize && pageIndex !== 0) {
                throw "Cannot create page for index '" + pageIndex + "' with pageSize '" + collection.options.pageSize + "'";
            }

            var options = collection.$options;

            if (options.pageSize) {
                this.$offset = pageIndex * options.pageSize;
                this.$limit = options.pageSize;
            }

            this.$pageIndex = pageIndex;
            this.$collection = collection;

            this.callBase(items);

            // stores the current fetch state
            this._fetch = {
                callbacks: [],
                state: State.CREATED
            };

        },


        parse: function (data, type) {
            return this.getRootCollection().parse(data, type);
        },

        getRootCollection: function(){
            return this.$collection.getRootCollection();
        },
        /***
         *
         * @param options
         * @param [Boolean] [options.fetchModels=false] fetch models inside collection
         * @param [Array] [options.fetchSubModels] fetch sub models
         * @param callback
         */
        fetch: function (options, callback) {
            options = options || {};

            var self = this;

            function pageFetchedComplete(err, page, originalCallback) {
                var callback = function (err, page) {
                    if (originalCallback) {
                        originalCallback(err, page, options)
                    }
                };


                if (options.fetchModels || options.fetchSubModels) {

                    // TODO: introduce poolSize parameter for par, and parEach

                    flow()
                        .parEach(page.$items, function(model, cb) {
                            model.fetch({
                                fetchSubModels: options.fetchSubModels
                            }, cb);
                        })
                        .exec(function (err) {
                            callback(err, page);
                        });

                } else {
                    callback(err, page);
                }

            }

            if (this._fetch.state === State.LOADING) {
                // currently fetching -> register callback
                this._fetch.callbacks.push(function (err, page) {
                    pageFetchedComplete(err, page, callback);
                });
            } else if (this._fetch.state == State.LOADED) {
                // completed loaded -> execute
                pageFetchedComplete(null, this, callback);
            } else {
                // set state and start loading
                self._fetch.state = State.LOADING;

                this.$collection.$context.$dataSource.loadCollectionPage(this, options, function (err, page) {
                    self._fetch.state = err ? State.ERROR : State.LOADED;

                    // execute callbacks
                    pageFetchedComplete(err, page, callback);

                    _.each(self._fetch.callbacks, function (cb) {
                        cb(err, page);
                    });
                });
            }
        }
    });

    Collection.of = function(modelFactory) {

        if (modelFactory instanceof Function) {
            return Collection.inherit(Collection.prototype.constructor.name + '[' + modelFactory.prototype.constructor.name + ']', {
                $modelFactory: modelFactory
            });
        }  else {
            throw "Cannot create Collection of '" + modelFactory + "'.";
        }


    };

    return Collection;
});