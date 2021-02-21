# A Bitly shim for UrlShortener service in Google Apps Script

In March 2018 Google announced it was [closing it’s Google URL Shortener](https://developers.googleblog.com/2018/03/transitioning-google-url-shortener.html) giving developers one year to migrate to their new Firebase Dynamic Links (FDL) service or other providers. The [`URLShortener` is also an Advanced Service](https://developers.google.com/apps-script/advanced/url-shortener) in Google Apps Script and so far I’ve seen no news that a FDL service will be created in its place. Our organisation had a couple of projects that used the `URLShortener` Service, exclusively used to shorten long links (we were never used other features like analytics). As we also use the [Bitly](https://bitly.com/) service using our custom domain it made sense to migrate our projects to use this instead. 

Typically a call to the URL Shortener service would be:
```
var url = UrlShortener.Url.insert({
          longUrl: A_LONG_URL_HERE
        });
var short_url = url.id;
```
So we don’t have to change any core code I created the following shim below which is published as a library at: `1ddSpTQoae2xdocyx0GcfNCKOjZu8je_OFWXUM_-cG-fGVJIQyxGRrAnQ`

## Source Code
```
var Util = (function (ns) {
  return {
    getCachedProperty: function (key){
      var cache = CacheService.getUserCache()
      var value = cache.get(key)
      if (!value){
        var value = PropertiesService.getUserProperties().getProperty(key);
        cache.put(key, value, 86400);
      }
      return value;
    },
    setToken: function(token){
      Util.setUserProperty_('BITLY_TOKEN', token);
    },
    setGUID: function(guid){
      Util.setUserProperty_('BITLY_GUID', guid);
    },
    CALL_: function(path,options){
      var fetchOptions = {method:"",muteHttpExceptions:true, contentType:"application/json", headers:{Authorization:"Bearer "+Util.getCachedProperty('BITLY_TOKEN')}};
      var url = 'https://api-ssl.bitly.com/v4' + path;
      for(option in options){
        fetchOptions[option] = options[option];
      }
      var response = UrlFetchApp.fetch(url, fetchOptions);
      return JSON.parse(response.getContentText());
    },
    setUserProperty_: function (key, value){
      CacheService.getUserCache().remove(key);
      PropertiesService.getUserProperties().setProperty(key, value)
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
      var r = Util.CALL_(path,callOptions);
      if (!r.link){
        throw new Error(r.message+': '+r.description);
      } else {
        return {id:r.link}
      }
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
```

One slight variation when using the Bitly API v4 is the requirement to include a `GROUP_GUID` as explained in the [Bitly v4 migration documentation](https://dev.bitly.com/v4/#section/API-Endpoints). Rather than modifying every script we use that uses the existing `UrlShortener` to get the `GROUP_GUID` this as well as your Bitly token is stored in the library as a Script Property. This means once it is setup the only modification we need to make to our projects is switching off the existing `UrlShortener` Advanced Service and adding the new `UrlShortener` library. All of this is explained in the setup steps detailed below.

## Using  `UrlShortener` (Bitly version)

As this solution is designed to operate with a single Bitly account I’ve not implemented the oAuth 2.0 flow so instead you need your Bitly "Generic Access Token" which is explained in the steps below:

1. Open new Google Apps Script project and in the Script Editor click **Resources > Libraries…** adding the following script id in the ‘Add a library’ field: `1ddSpTQoae2xdocyx0GcfNCKOjZu8je_OFWXUM_-cG-fGVJIQyxGRrAnQ`

2. Log in to Bitly account and from the ≡ menu navigate to **Settings >  Advanced Settings** and click the **OAuth link** under For Developers. Now click on the **'Generic Access Token'** menu, enter your Bitly password, copy the access token

3. In to the Script Editor copy the code below adding your access token where indicated:
```
function oneTimeSetup() {
  UrlShortener.Util.setToken('YOUR_GENERIC_ACCESS_TOKEN_HERE');
  var grp = UrlShortener.Groups.list();
  UrlShortener.Util.setGUID(grp.groups[0].guid);
}
```
4. Save your script project and then **Run > oneTimeSetup**

5. After authenticating the script should store both the access token and `GROUP_GUID`

6. You can test by running the following function in the Script Editor and checking the logger for the result:
```
function testShorten(){
  var url = UrlShortener.Url.insert({
    longUrl: '[https://tu.appsscript.info](https://tu.appsscript.info)'
  });
  var short_url = url.id;
  Logger.log(short_url);
}
```
Once you’ve completed the steps above you can delete the script project as it’s no longer required. To use the `UrlShortener` (Bitly version) in projects where you were using the original `UrlShortener` advanced service open these projects and remove it as an advanced service and add the library as covered in step 1. If your project doesn’t already connect to an external service via `UrlFetchApp` you might to to test run in case any additional permissions are required.

## Summary

The shim we have developed is designed to include only the API endpoints we require to replace the functionality in our existing code and anyone is welcome to extend this to cover more of the Bitly API as required (here is the [source code with appropriate GPL licence](https://github.com/mhawksey/UrlShortener)) 
