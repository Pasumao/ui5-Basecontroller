import Controller from "sap/ui/core/mvc/Controller";
import View from "sap/ui/core/mvc/View";
import Component from "../Component";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import JSONModel from "sap/ui/model/json/JSONModel";
import Model from "sap/ui/model/Model";
import Control from "sap/ui/core/Control";
import SelectDialog from "sap/m/SelectDialog";
import StandardListItem from "sap/m/StandardListItem";
import MultiInput from "sap/m/MultiInput";
import Input from "sap/m/Input";
import Token from "sap/m/Token";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";

export default class BaseController extends Controller {
    private ViewId: string;
    private _GlobalModemodel: JSONModel;
    EventBus: import("sap/ui/core/EventBus").default;
    Router: import("sap/ui/core/routing/Router").default;


    public onInit(): void {
        this._bind();
        this._onInit();
        this._registerModel();
        this._registerEvent();
    }

    protected _bind(): void {
        this.ViewId = (<View>this.getView()).getId();
        this.Router = (<Component>this.getOwnerComponent()).getRouter();
        this.EventBus = (<Component>this.getOwnerComponent()).getEventBus();
        this._GlobalModemodel = (<JSONModel>(<Component>this.getOwnerComponent()).getModel("GlobalModelStore"));
    }

    protected _registerModel(): void {}
    protected _registerEvent(): void {}
    protected _onInit(): void {}

    public getmodel(modelname: string): ODataModel | JSONModel | Model | undefined {
        const modelinfo = this._GlobalModemodel.getProperty("/models").find((info: { modelname: string; }) => info.modelname === modelname);

        if (modelinfo) {
            if (modelinfo.view === "global") {
                return (<Component>this.getOwnerComponent()).getModel(modelname);
            } else if (modelinfo.view === this.ViewId) {
                return (<View>this.getView()).getModel(modelname);
            }
        }
        return undefined;
    }

    public setmodel(oModel: Model, modelname: string, view: string = this.ViewId): void {
        
        if (view === "global") {
            (<Component>this.getOwnerComponent()).setModel(oModel, modelname);
            this.addmodel(modelname,view)
        } else if (view === this.ViewId) {
            (<View>this.getView()).setModel(oModel, modelname);
            this.addmodel(modelname,view)
        }
    }

    private addmodel(modelname:string, view: string){
        const _GlobalModemodel = this._GlobalModemodel.getProperty("/models")
        _GlobalModemodel.push({
            modelname : modelname,
            view : view
        });
        this._GlobalModemodel.setProperty("/models",_GlobalModemodel);
    }

    public getmodelproperty(modelname: string, propertyname: string): any {
        const model = this.getmodel(modelname);
        return model?.getProperty(propertyname);
    }

    public setmodelproperty(modelname: string, propertyname: string, value: any): void {
        const model = this.getmodel(modelname);

        if (model instanceof JSONModel || model instanceof ODataModel) {
            model.setProperty(propertyname, value);
        } else {
            console.error(`The model '${modelname}' does not support 'setProperty'.`);
        }
    }
    
    public getmodeldata(oModelname: string, Path?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const oModel = this.getmodel(oModelname);

            if (oModel instanceof JSONModel) {
                resolve(Path ? oModel.getData()[Path] : oModel.getData());
            } else if (oModel instanceof ODataModel) {
                oModel.read(Path as string, {
                    success: (oData: any) => {
                        resolve(oData.results);
                    },
                    error: (error: any) => reject(error)
                });
            } else {
                reject(new Error(`Model '${oModelname}' is not recognized.`));
            }
        });
    }

    public setmodeldata(oModelname: string, data: any): void {
        const oModel = this.getmodel(oModelname);
    
        if (oModel instanceof JSONModel) {
            oModel.setData(data);
        } else {
            console.error(`The model '${oModelname}' is not recognized as a JSONModel.`);
        }
    }
    
    fieldlist:{title:string,description:string};
    Control:Control;
    mode:string;
    keymodel:string;
    keyfield:string;

    public smartvaluehelp(oEvent: any, oData: any, mode?: string): void {
        this.Control = oEvent.getSource() as Control;
        const sControlType = this.Control.getMetadata().getName();

        this.mode = mode || (sControlType === "sap.m.MultiInput" ? 'multi' : 'input');

        const modelname = this.Control.data("vhmodelpath")?.modelname || oData?.modelname;
        const modelpath = this.Control.data("vhmodelpath")?.modelpath || oData?.modelpath;
        this.fieldlist = this.Control.data("fieldlist") || oData?.fieldlist;
        this.keymodel = oData?.keymodel;
        this.keyfield = oData?.keyfield;

        this.getmodeldata(modelname, modelpath).then((aData) => {
            if (!aData || !Array.isArray(aData)) {
                console.error("[ERROR] No data retrieved or data format is incorrect.");
                return;
            }

            const aUniqueData = this.removeDuplicates(aData, this.fieldlist.title);

            const oUniqueModel = new JSONModel();
            oUniqueModel.setData({ items: aUniqueData });

            const Dialog = new SelectDialog({
                title: "SelectDialog",
                contentHeight: "40%",
                items: {
                    path: "/items",
                    template: new StandardListItem({
                        title: `{${this.fieldlist.title}}`,
                        description: this.fieldlist.description ? `{${this.fieldlist.description}}` : '',
                        type: "Active"
                    })
                },
                liveChange: (oEvent) => {
                    const sValue = oEvent.getParameter("value");
                    const oFilter = sValue ?
                        new Filter(this.fieldlist.title, FilterOperator.Contains, sValue) :
                        [];
                    (oEvent.getSource() as any).getBinding("items").filter(oFilter);
                },
                confirm: (oEvent) => {
                    const oModel = this.getmodel(modelname) as JSONModel;
                    if (this.mode !== "multi") {
                        const oSelectedItem = <StandardListItem>oEvent.getParameter("selectedItem");
                        if (this.keymodel && this.keyfield) {
                            oModel.setProperty(`${this.keymodel}/${this.keyfield}`, oSelectedItem.getTitle());
                        } else {
                            (this.Control as Input).setValue(oSelectedItem.getTitle());
                        }
                    } else {
                        const aSelectedItems = oEvent.getParameter("selectedItems");
                        if (aSelectedItems && aSelectedItems.length > 0) {
                            const aTokens = aSelectedItems.map((oItem: any) => new Token({ text: oItem.getTitle() }));
                            (this.Control as MultiInput).setTokens(aTokens);

                            const aSelectedKeys = aSelectedItems.map((oItem: any) => oItem.getTitle());
                            oModel.setProperty(`${this.keymodel}/${this.keyfield}`, aSelectedKeys);
                        }
                    }
                }
            });

            if (this.mode === "multi") {
                Dialog.setMultiSelect(true);
                const aTokens = (this.Control as MultiInput).getTokens().map(token => token.getText());
                Dialog.attachUpdateFinished(() => {
                    const oList = Dialog.getItems();
                    oList.forEach((oItem) => {
                        if (aTokens.includes((oItem as StandardListItem).getTitle())) {
                            oItem.setSelected(true);
                        }
                    });
                });
            }

            const sResponsiveStyleClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--subHeader sapUiResponsivePadding--content sapUiResponsivePadding--footer";
            Dialog.toggleStyleClass(sResponsiveStyleClasses, true);
            Dialog.setResizable(true);
            Dialog.setDraggable(true);

            Dialog.setModel(oUniqueModel);

            Dialog.open('');
        }).catch((oError) => {
            console.error("Error retrieving data for value help:", oError);
        });
    }

    private removeDuplicates(dataArray: any[], key: string): any[] {
        if (!key) return dataArray;
        const uniqueKeys = new Set();
        return dataArray.filter(item => {
            const value = item[key];
            if (value == null || uniqueKeys.has(value)) {
                return false;
            }
            uniqueKeys.add(value);
            return true;
        });
    }

}
