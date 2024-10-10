sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("app.controller.ModelController", {
        onInit(){
            this._bind();
            this._registerModel();
            this._registerEvent();
            this._onInit();
        },

        _bind(){           //绑定this的元素
            this._ViewId = this.getView().getId();
            this._GlobalModemodel = this.getOwnerComponent().getModel("GlobalModelStore");
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
                    resolve()
                }
            })
        },

        setmodeldata(oModelname,oData){
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
    }
)})
