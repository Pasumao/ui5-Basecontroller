sap.ui.define([
    "app/controller/ModelController"
], function (Controller) {
    "use strict";

    return Controller.extend("app.controller.BaseController", {
        _bind(){           //绑定this的元素
            Controller.prototype._bind.apply(this, arguments);
            this.Router = this.getOwnerComponent().getRouter();
            this.EventBus = this.getOwnerComponent().getEventBus();
            this.EventLoop = [];
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
