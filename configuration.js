//General purposes
var DEBUGMODE=[true|false];
var API_URL = "https://admin.shippify.co";
var API_URL_SKU = "{{accountName}}.vtexcommercestable.com.br/api/catalog_system/pvt/sku/stockkeepingunitbyid/";
var RESOURCE_URL = "https://cdn.shippify.co/service";
var SHIPPING_NAME=["Shippify"];
var API_ID = "{{ShippifyApiId}}"; // Insert your API id
var API_TOKEN = "{{ShippifyApiToken}}"; // Insert your API token
var X_VTEX_API_APPKEY = "{{VtexAccountEmail}}";
var X_VTEX_API_APPTOKEN = "{{VtexAccountPass}}";
var PAGE_LANG = "pt";

//Available countries and cities
var COUNTRIES=["BRA","ECU","CLI"];
var STATES=["SP"];
var CITIES=["Sao Paolo","Guayaquil"];

var COMPANY_ID = -1;
var COMPANY_EMAIL="{{EmailToReceiver}}";
var COMPANY_SUBJECT="{{SubjectToReceiver}}";

//Something about the default values and configuration to task.
var AVAILABLE_DIMENSIONS = ["height","length","width"];
var SIZE_FOR_DIMENSIONS = [50,80,120,150,150];
var RADIO_DIMENTION = 10;
var PICKUP_DEFAULT = ["São Paulo","-23.6548036","-46.759461"];
var DELIVERY_DEFAULT = ["São Paulo","-23.6548036","-46.759461"];
var MAX_DISTANCE = 199;
var PRODUCTS=[];
