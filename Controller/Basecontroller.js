sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("spec001.controller.BaseController", {
        onInit(){
            this._bind();
            this._registerModel();
            this._registerEvent();
            this._onInit();
        },

        _bind(){           //绑定this的元素
            this._ViewId = this.getView().getId();
            this._GlobalModemodel = this.getOwnerComponent().getModel("GlobalModelStore");
            this.Router = this.getOwnerComponent().getRouter();
            this.EventBus = this.getOwnerComponent().getEventBus();
        },         
        _registerModel(){},//注册model
        _registerEvent(){},//注册事件
        _onInit(){},       //其他初始化设置

        getmodel(modelname){
            var modelinfo = this._GlobalModemodel.getProperty("/models").find((modelinfo) => {
                return modelinfo.modelname === modelname;
            })

            if(modelinfo){
                if(modelinfo.view === "global" ){
                    return this.getOwnerComponent().getModel(modelname); 
                }else if (modelinfo.view === this._ViewId ){
                    return this.getView().getModel(modelname);
                }else{
                    return undefined;
                }
            }
            return undefined;
        },

        setmodel(oModel,modelname,view){
            if(!view){
               view = this._ViewId
            }
            if (view == "global") {
                this.getOwnerComponent().setModel(oModel, modelname);
                this.addmodel(modelname,view);
                return ;
            }else if(view === this._ViewId){
                this.getView().setModel(oModel, modelname);
                this.addmodel(modelname,view);
                return ;
            }
        },

        addmodel(modelname,view){
            const _GlobalModelist = this._GlobalModemodel.getProperty("/models");
            _GlobalModelist.push({
                modelname:modelname,
                view:view
            });
            this._GlobalModemodel.setProperty("/models",_GlobalModelist);
        },

        getmodelproperty(modelname,propertyname){
            const model = this.getmodel(modelname);
            return model.getProperty(propertyname);
        },

        setmodelproperty(modelname,propertyname,value){
            var model = this.getmodel(modelname);
            return model.setProperty(propertyname,value);
        },

        getmodeldata(oModelname,Path){
            return new Promise((resolve,reject)=>{
                var oModel = this.getmodel(oModelname);
                if (oModel instanceof sap.ui.model.json.JSONModel) {
                    resolve(Path?oModel.getData()[Path]:oModel.getData());
                } else if (oModel instanceof sap.ui.model.odata.v2.ODataModel) {
                        oModel.read( Path ,{
                        success: (oData,oResponse) => {
                            var itemslist = [];
                            for (let index = 0; index < oData.length; index++) {
                                const element = oData[index];
                                itemslist.push(element);
                            }
                            resolve(oData.results)
                        },
                        error: (error) => reject(error)
                        })
                } else {
                    return undefined;
                }
            })
        },

        setmodeldata(oModel,oData){
            var oModel = this.getmodel(oModelname);

            if (oModel instanceof sap.ui.model.json.JSONModel) {
                oModel.setData(oData);
            } else {
                console.error(`The model '${oModelname}' is not recognized as a JSONModel.`);
            }
        },

        smartvaluehelp(oEvent,oData,mode){         
            //判断是否控件类型决定SelectDialog类型
            this.Control = oEvent.getSource()
            var sControlType = this.Control.getMetadata().getName();

            this.mode = mode || (sControlType === "sap.m.MultiInput" ? 'multi' : 'input');
    
            var modelname = this.Control.data("vhmodelpath")?.modelname || oData?.modelname;
            var modelpath = this.Control.data("vhmodelpath")?.modelpath || oData?.modelpath;
            this.fieldlist = this.Control.data("fieldlist") || oData?.fieldlist;
            this.keymodel = oData?.keymodel;
            this.keyfield = oData?.keyfield;

            this.getmodeldata(modelname, modelpath).then((aData) => {
                if (!aData || !Array.isArray(aData)) {
                    console.error("[ERROR] No data retrieved or data format is incorrect.");
                    return;
                }
                // 对获取的数据进行去重处理
                var aUniqueData = this.removeDuplicates(aData, this.fieldlist.title);
        
                // 创建一个临时模型来保存去重后的数据
                var oUniqueModel = new sap.ui.model.json.JSONModel();
                oUniqueModel.setData({ items: aUniqueData });
             
                var Dialog = new sap.m.SelectDialog({
                    title: "SelectDialog",
                    contentHeight:"40%",
                    items: {
                        path: "/items",
                        //sorter: new sap.ui.model.Sorter(keyfiled, false),
                        template: new sap.m.StandardListItem({
                            title: "{"+this.fieldlist.title+"}",
                            description:this.fieldlist.description?"{"+this.fieldlist.description+"}": null,
                            type: "Active"
                        })
                    },
                    liveChange: (oEvent)=>{
                        var sValue = oEvent.getParameter("value");
                        var oFilter = sValue ? 
                            new sap.ui.model.Filter(this.fieldlist.title, sap.ui.model.FilterOperator.Contains, sValue) :
                            [];
                        oEvent.getSource().getBinding("items").filter(oFilter);
                    },
                    confirm: (oEvent) => {
                        var oModel = this.getmodel(modelname);
                        if (this.mode !== "multi") {
                            var oSelectedItem = oEvent.getParameter("selectedItem");
                            if (this.keymodel && this.keyfield) {
                                oModel.setProperty(this.keymodel + "/" + this.keyfield, oSelectedItem.getTitle());
                            } else {
                                this.Control.setValue(oSelectedItem.getTitle());
                            }
                        } else {
                            var aSelectedItems = oEvent.getParameter("selectedItems");
                            if (aSelectedItems && aSelectedItems.length > 0) {
                                var aTokens = aSelectedItems.map((oItem) => {
                                    return new sap.m.Token({
                                        text: oItem.getTitle()
                                    });
                                });
                                this.Control.setTokens(aTokens);
                    
                                // 同步选中的 token 到 model
                                var aSelectedKeys = aSelectedItems.map(oItem => oItem.getTitle());
                                oModel.setProperty(this.keymodel + "/" + this.keyfield, aSelectedKeys);
                            }
                        }
                    }
                    });

                if ( this.mode == "multi") {
                    Dialog.setMultiSelect(true);
                    var aTokens = this.Control.getTokens().map(token => token.getText());
                    Dialog.attachUpdateFinished(() => {
                        var oList = Dialog.getItems();
                        oList.forEach((oItem) => {
                            if (aTokens.includes(oItem.getTitle())) {
                                oItem.setSelected(true);
                            }
                        });
                    });
                }

                var sResponsiveStyleClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--subHeader sapUiResponsivePadding--content sapUiResponsivePadding--footer";
                Dialog.toggleStyleClass(sResponsiveStyleClasses,true);
                Dialog.setResizable(true);
                Dialog.setDraggable(true);

                Dialog.setModel(oUniqueModel)

                Dialog.open();
            }).catch((oError) => {
                console.error("Error retrieving data for value help:", oError);
            });
        },

        removeDuplicates: function(dataArray, key) {
            if (!key) return dataArray; // 如果没有key，不进行去重
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
)})