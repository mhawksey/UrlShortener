var Util = (function (ns) {
  return {
    getCachedProperty: function (key){
      var cache = CacheService.getScriptCache()
      var value = cache.get(key)
      if (!value){
        var value = PropertiesService.getScriptProperties().getProperty(key);
        cache.put(key, value, 86400);
      }
      return value;
    },
    setToken: function(token){
      Util.setScriptProperty_('BITLY_TOKEN', token);
    },
    setGUID: function(guid){
      Util.setScriptProperty_('BITLY_GUID', guid);
    },
    CALL_: function(path,options){
      var fetchOptions = {method:"",muteHttpExceptions:true, contentType:"application/json", headers:{Authorization:"Bearer "+Util.getCachedProperty('BITLY_TOKEN')}};
      var url = 'https://api-ssl.bitly.com/v4' + path;
      for(option in options){
        fetchOptions[option] = options[option];
      }
      var response = UrlFetchApp.fetch(url, fetchOptions);
      if(response.getResponseCode() != 200){
        throw new Error(response.getContentText())
      }else{
        return JSON.parse(response.getContentText());
      }
    },
    setScriptProperty_: function (key, value){
      CacheService.getScriptCache().remove(key);
      PropertiesService.getScriptProperties().setProperty(key, value)
    }
  }
})(Util|| {});


var Url = (function (ns) {
  return {
    insert: function (obj){
      var path = '/shorten';
      var callOptions = {method:"POST",payload:JSON.stringify({
        "long_url": obj.longUrl,
        "group_guid": Util.getCachedProperty('BITLY_GUID')
      })};
      var r = Util.CALL_(path,callOptions)
      return {id:r.link};
    }
  }
})(Url|| {});

var Groups = (function (ns) { 
  return {
    list: function(){
      var path = '/groups';
      var callOptions = {method:"GET"};
      return Util.CALL_(path,callOptions);
    }
  }
})(Groups|| {});