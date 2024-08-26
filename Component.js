/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "spec001/model/models",
        "sap/ui/model/json/JSONModel"
    ],
    function (UIComponent, Device, models, JSONModel) {
        "use strict";

        return UIComponent.extend("spec001.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                sap.ui.getCore().getConfiguration().setTimezone("UTC");

                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                var oManifestModels = this.getManifestEntry("sap.ui5").models;
                var oGlobalModelStore = {
                    models:[                    
                        {
                            modelname : "GlobalModelStore",
                            view : "global"
                        }
                    ]
                };
                
                for (var sModelName in oManifestModels) {
                    if (oManifestModels.hasOwnProperty(sModelName)) {
                        var oModelInstance = this.getModel(sModelName);
                        if (oModelInstance) {
                            oGlobalModelStore.models.push({
                                modelname : sModelName,
                                view : "global"
                            });
                        }
                    }
                }
                this.setModel(new JSONModel(oGlobalModelStore),"GlobalModelStore");
            }
        });
    }
);