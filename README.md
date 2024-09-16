# 文档
## function
### _bind()
绑定this属性
### _registerModel()
注册model
### _registerEvent()
注册event
### _onInit()
其他事项
### getmodel(modelname) return sap/ui/model/<any> | undefined
获取model
### setmodel(oModel,modelname,view?)
注册model，默认为当前View，如果view传入"global"则注册为全局变量
### getmodelproperty(modelname,propertyname) return any
获取model的property
### setmodelproperty(modelname,propertyname,value)
设置model的property
### getmodeldata(oModelname,Path?) return Promise<any>
获取model的数据，如果path为空则返回全部数据
### setmodeldata(oModel,oData)
设置model的data
### clearmodel(modelname)
model设置为空
### _Event(func,level = 1)
事件冲突时可以使用该方法，他只会执行等级最高的事件，阻塞其他事件
### LoadMetadata(modelname)
读取odata服务的metadata内的字段类型和长度等描述
### async check_datavalue(Data, modelname, entityname, fieldname) return bool
检测是否符合odata服务所定义的类型和长度
### async check_datainlist(data, modelname, path, fieldname, isKey = false) return bool
检测是否在定义域内

## XMLView function
### smartvaluehelp
#### 示例
```xml
<m:Input 
  showValueHelp="true" 
  valueHelpRequest="smartvaluehelp">
  <m:customData>
    <core:CustomData key="vhmodelpath" value='{"modelname":"MODELNAME","modelpath":"PROPERTYPATH"}'/>		
    <core:CustomData key="fieldlist" value='{"title":"VALUE","description":"TEXT"}'/>
  </m:customData>
</m:Input>
```
#### 参数
modelname : String  #model的类型 ：JSONModel | oDataModel  
modelpath : String  
fieldlist : { title : String , description : String | null }  
### smarttablesort
#### 示例
```xml
<Table id="idView1Table" items="{oData_data>/data}" autoPopinMode="true">
                <headerToolbar>
                    <OverflowToolbar id="idView1OverflowToolbar" class="sapUiMediumMarginTop">
                        <Button icon="sap-icon://sort" type="Transparent" press="smarttablesort">
                            <customData>
                                <core:CustomData key="sortlist" value='{
                                    "sortlist":[
                                        {
                                            "key":"vbeln",
                                            "text":"Sales Order No.",
                                            "selected": true
                                        },
                                        {
                                            "key":"aedat",
                                            "text":"Changed On"
                                        },
                                        {
                                            "key":"kwmeng",
                                            "text":"Quantity"
                                        },
                                        {
                                            "key":"netwr",
                                            "text":"Net Amount"
                                        }
                                    ]
                                }'/>
                            </customData>
                        </Button>
                        <Button icon="sap-icon://action-settings" type="Transparent"></Button>
                    </OverflowToolbar>
                </headerToolbar>
```
#### 参数
sortlist ： json格式   
            key ： 对应items锁绑的model的key  
            text ： 在sort里显示的字段  
            selected ： 是否被选中  
