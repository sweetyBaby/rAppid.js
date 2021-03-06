define(['srv/auth/AuthenticationFilter', 'flow', 'srv/core/AuthenticationService'], function (AuthenticationFilter, flow, AuthenticationService) {

    return AuthenticationFilter.inherit('srv.filter.TokenAuthenticationFilter', {

        defaults: {
            tokenParameter: "token"
        },

        inject: {
            authenticationService: AuthenticationService
        },

        /***
         *
         * @param context
         * @return {Boolean}
         */
        isResponsibleForRequest: function (context) {
            var parameter = context.request.get.parameter;
            return parameter.hasOwnProperty(this.$.tokenParameter);
        },

        beginRequest: function (context, callback) {
            if (this.isResponsibleForRequest(context)) {
                var parameter = context.request.get.parameter;
                this.authenticateRequestByToken(context, parameter[this.$.tokenParameter], callback);
            } else {
                callback();
            }
        }

    });
});