[![View TypeScript Files](https://img.shields.io/badge/View%20TypeScript%20Files-Click%20Here-blue?style=for-the-badge)](./_TS)

# 文档
## smartvaluehelp
### 示例
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
### 参数
modelname : String  #model的类型 ：JSONModel | oDataModel  
modelpath : String  
fieldlist : { title : String , description : String | null }  
