sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";
    
    return Controller.extend("project.controller.BaseController", {
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
            this.EventLoop = [];
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
            }else if(view === this._ViewId){
                this.getView().setModel(oModel, modelname);
                this.addmodel(modelname,view);
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

        clearmodel(modelname){
            var oModel = this.getmodel(modelname);

            if (oModel instanceof sap.ui.model.json.JSONModel) {
                var modelinfo = this._GlobalModemodel.getProperty("/models").find((modelinfo) => {
                    return modelinfo.modelname === modelname;
                })
    
                if(modelinfo){
                    if(modelinfo.view === "global" ){
                        return this.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel(), modelname); 
                    }else{
                        return this.getView().setModel(new sap.ui.model.json.JSONModel(), modelname);
                    }
                }
            }
        },

        _Event(func,level = 1){
            this.EventLoop.push({func,level});
            setTimeout(()=>{
                if (this.EventLoop.length == 0) {
                    return ;
                }
                var funcmax = ()=>{};
                var levelmax = 0;
                this.EventLoop.forEach((event)=>{
                    if (event.level > levelmax) {
                        levelmax = event.level;
                        funcmax = event.func;
                    }
                })
                this.EventLoop = [];
                funcmax();
            },0)
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
        },

        LoadMetadata(modelname) {
            var metadata = this.getmodel(modelname).getServiceMetadata();
            var jsonModelData = {};
        
            metadata.dataServices.schema.forEach(function(schema) {
                schema.entityType.forEach(function(entityType) {
                    if (entityType.name.match(/^Z/i)) { // 使用正则表达式匹配大小写的 "Z" 开头
        
                        var fieldsInfo = {};
                        var typeName = entityType.name; 
                        if (typeName.endsWith("Type")) {
                            typeName = typeName.slice(0, -4);
                        }
        
                        entityType.property.forEach(function(property) {
                            var fieldName = property.name;
                            var fieldType = property.type;
                            var maxLength = property.maxLength || null;
                            var precision = property.precision || null;
                            var scale = property.scale || null;
                            var isKey = entityType.key.propertyRef.some(function(key) {
                                return key.name === fieldName;
                            });
                            var extensions = property.extensions ? property.extensions.map(function(ext) {
                                return {
                                    name: ext.name,
                                    value: ext.value,
                                    namespace: ext.namespace
                                };
                            }) : [];
        
                            fieldsInfo[fieldName] = {
                                type: fieldType,
                                maxLength: maxLength,
                                precision: precision,
                                scale: scale,
                                isKey: isKey,
                                extensions: extensions
                            };
                        });
        
                        jsonModelData[typeName] = fieldsInfo;
                    }
                });
            });
        
            // 创建一个新的 JSONModel 并存储数据
            var oJsonModel = new sap.ui.model.json.JSONModel(jsonModelData);
            this.setmodel(oJsonModel,modelname+"_Metadata");
        },

        _validateFieldValue(value, metadata) {
            if (!metadata.isKey && !value) {
                return true;
            }
            switch (metadata.type) {
                case "Edm.String":
                    return !metadata.maxLength || value.length <= metadata.maxLength;
                case "Edm.Int32":
                    return Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
                case "Edm.Decimal":
                    var regex = new RegExp("^(-)?\\d{1," + (metadata.precision - metadata.scale) + "}(\\.\\d{1," + metadata.scale + "})?$");
                    return regex.test(value.toString());
                case "Edm.Boolean":
                    return typeof value === "boolean";
                case "Edm.DateTime":
                    return !isNaN(Date.parse(value));
                // 添加其他类型的验证规则
                default:
                    console.warn("未处理的类型: " + metadata.type);
                    return false;
            }
        },

        async check_datavalue(Data, modelname, entityname, fieldname) {
            var oModel = this.getmodel(modelname);
            var metadata = this.getmodel(modelname + "_Metadata").getData()[entityname][fieldname];

            if (oModel instanceof sap.ui.model.json.JSONModel) {
                return this._validateFieldValue(Data, metadata);
            } else if (oModel instanceof sap.ui.model.odata.v2.ODataModel) {
                return this._validateFieldValue(Data, metadata);
            } else {
                return undefined;
            }
        },

        async check_datainlist(data, modelname, path, fieldname, isKey = false) {
            var oModel = this.getmodel(modelname);
            var listData;

            if (!isKey && !data) {
                return true;
            }
        
            if (oModel instanceof sap.ui.model.json.JSONModel) {
                listData = this.getmodelproperty(modelname, path);
            } else if (oModel instanceof sap.ui.model.odata.v2.ODataModel) {
                listData = await this.getmodeldata(modelname, path);
            } else {
                return undefined;
            }
        
            return !listData.every(element => element[fieldname] != data);
        },

        smarttablesort(oEvent){
            var oControl = oEvent.getSource();
            var sortlist = oControl.data("sortlist").sortlist;
            var oParent = oControl.getParent();
            
            while (oParent && !(oParent instanceof sap.m.Table)) {
                oParent = oParent.getParent();
            }

            var Dialog = new sap.m.ViewSettingsDialog({
                title: "Sort Dialog",
                sortItems: sortlist.map(item => {
                    return new sap.m.ViewSettingsItem({
                        key:item.key,
                        text:item.text,
                        selected:item?.selected
                    })
                }),
                confirm:(oEvent) => {
                    var mParams = oEvent.getParameters();
                    var oBinding = oParent.getBinding("items");
                    var sPath = mParams.sortItem.getKey()
                    var bDescending = mParams.sortDescending;
                    oBinding.sort([new sap.ui.model.Sorter(sPath, bDescending)]);
                }
            });

            Dialog.open()
        }

    }
)})
