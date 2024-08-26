import Control from "sap/ui/core/Control";
import UIComponent from "sap/ui/core/UIComponent";
import XMLView from "sap/ui/core/mvc/XMLView";
import JSONModel from "sap/ui/model/json/JSONModel";
/**
* @namespace abapwiki.app
*/
export default class Component extends UIComponent {

    public static metadata = {
        "interfaces": ["sap.ui.core.IAsyncContentCreation"],
        "manifest": "json"
    };

    init(): void {
        // call the init function of the parent
        super.init();

        var GlobalModellist = {
            models:[
                {
                    modelname:"GlobalModelStore",
                    view:"global"
                }
            ]
        };

        const oManifestModels = this.getManifestEntry("sap.ui5").models;

        for (const sModelName in oManifestModels) {
            if (oManifestModels.hasOwnProperty(sModelName)) {
                const oModelInstance = this.getModel(sModelName);
                if (oModelInstance) {
                    GlobalModellist.models.push({
                        modelname: sModelName,
                        view: "global"
                    });
                }
            }
        }

        this.setModel(new JSONModel(GlobalModellist), "GlobalModelStore");
    };

    createContent(): Control | Promise<Control | null> | null {
        return XMLView.create({
            "viewName": "abapwiki.app.view.App",
            "id": "app"
        });
    };
};