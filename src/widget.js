/*
Widget.js should be called shippify.js
Author : Leonardo Larrea
Shippify Inc.
*/
  var city = "";
  var country = "";
  var enableMap = false;
  var isEditTask=true;
  var bounds;
  var city_location = {lat : DELIVERY_DEFAULT[1], lng :DELIVERY_DEFAULT[2]};
  var currency;
  var deliveryMarker;
  var fare = 0.00;
  var fixedPickup = true;
  var geocoder;
  var infowindow;
  var map;
  var poly;
  var pickupMarker;

  //Widget Labels
  var additionalTitle;
  var deliveryAddressTitle;
  var invalidNumber;
  var invalidMail;
  var mailTitle;
  var moveDelivery;
  var nameTitle;
  var phoneTitle;
  var priceTagTitle;
  var validNumber;
  var validMail;
  var cityError;
  var numberHouse;
  var intents=0;
  var initGlobal;

	  //Utils functions
	function printInConsole(message){
		if(DEBUGMODE){
		  console.log(message);
		}
	}

	function generateTASKObj(params,productArr){
		var name= params.name || "";
		var email= params.email || "";
		var phone= params.phone || "";
		var address= params.address || "";
		var task = {
		  products: productArr,
		  recipient: {
		    name: name,
		    email: email,
		    phone: phone
		  },
		  country:params.country,
		  city:params.city
		};
		if(PICKUP_DEFAULT.length>0){
		  task.pickup={
		    address:PICKUP_DEFAULT[0],
		    lat:PICKUP_DEFAULT[1],
		    lng:PICKUP_DEFAULT[2]
		  };
		}else{

		}
		if(params.address!=undefined){
		  task.deliver={
		     address:params.address,
		     lat:params.delivery_lat,
		     lng:params.delivery_lng
		  };
		}
		task.send_email_params=JSON.stringify({
		  "from":COMPANY_EMAIL,// Company name or email. (string)
		  "subject":COMPANY_SUBJECT,// Email subject. (string)
		  "to":email// Client email. (string)
		});
		return task;
	}

  ///Language Selector

  if (PAGE_LANG === "es"){//Spanish
    phoneTitle = "Teléfono";
    mailTitle = "Correo Electrónico";
    additionalTitle = "Adicional";
    moveDelivery = "Arrastra el marcador";
    invalidNumber = "Número incorrecto";
    validNumber = "Correcto";
    invalidMail = "Correo incorrecto";
    validMail = "Correo correcto";
    cityError= "Esta ciudad esta no esta disponible para el servicio de "+SHIPPING_NAME[0];
    numberHouse= "Número";
  }else if (PAGE_LANG === "pt"){//Portugese
    phoneTitle = "Telefone";
    mailTitle = "Correio";
    additionalTitle = "Adicional";
    moveDelivery = "Arraste o marcador";
    invalidNumber = "Número errado";
    validNumber = "Válido";
    invalidMail = "Correio errado";
    validMail = "Válido";
    cityError= "Esta ciudad esta no esta disponible para el servicio de "+SHIPPING_NAME[0];
    numberHouse= "Número";
  }else if (PAGE_LANG === "en"){//English
    phoneTitle = "Phone";
    mailTitle = "E-Mail";
    additionalTitle = "Additional";
    moveDelivery = "Drag Me";
    invalidNumber = "You entered an invalid number";
    validNumber = "Valid";
    invalidMail = "You entered an invalid e-mail";
    validMail = "Valid";
    cityError= "This city selected don't have "+SHIPPING_NAME[0]+" Service";
    numberHouse= "Number";
  }else{//Default
    phoneTitle = "Phone";
    mailTitle = "E-Mail";
    additionalTitle = "Additional";
    moveDelivery = "Drag Me";
    invalidNumber = "You entered an invalid number";
    validNumber = "Valid";
    invalidMail = "You entered an invalid e-mail";
    validMail = "Valid";
    cityError= "This city selected don't have "+SHIPPING_NAME[0]+" Service";
    numberHouse= "Number";
  }

  //Task example
  var task={
    pickup:{
      lat    : "0",
      lng    : "0",
      address: "Ocean"
    }/* If you want put a specific delivery location for this product*/
  };

  if(taskObj==undefined){
    var taskObj={};
  }

  function animateBounce() {
    if (deliveryMarker) {
      deliveryMarker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(function() {
        infowindow.setContent(moveDelivery);
        infowindow.open(map, deliveryMarker);
        deliveryMarker.setAnimation(null);
      }, 3000);
    }
  }

  function getScript(url, onSuccess) {
    var script = document.createElement('script');
    script.src = url;

    var head = document.getElementsByTagName('head')[0];
    done = false;

    script.onload = script.onreadystatechange = function () {
      if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
        done = true;

        onSuccess();
        script.onload = script.onreadystatechange = null;
        head.removeChild(script);

      }
    }
    head.appendChild(script);
  }


  function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }

  function eraseCookie(name) {
    createCookie(name,"",-1);
  }


  function hashHandler(){
    this.oldHash = window.location.hash;
    this.Check;

    var that = this;
    var detect = function(){
        if(that.oldHash!=window.location.hash){
            printInConsole("HASH CHANGED - new has" + window.location.hash);
            onPayment();
            onShipping();
            that.oldHash = window.location.hash;
        }
    };
    this.Check = setInterval(function(){ detect() }, 100);
   }
   var hashDetection = new hashHandler();
  /*
    Function: didClickSubmitInput(marker)
    Description: Updates task object when marker is moved
  */
  function didClickSubmitInput(pickupMarker) {
    var size = 3;
    var qty = 1;
    var items = (task.products || []);
    var credentials= API_ID+ ":" +API_TOKEN;
    var priceTax = $('label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[0]+'"]').find('.shipping-option-item-value').text();

    if (!pickupMarker) {
      printInConsole("Missing parameters ");
      return;
    }
    if (!deliveryMarker) {
      printInConsole("Missing parameters ");
      return;
    }
    if (task.product != undefined) {
      items.push(task.product);
    }
    items = items.map(function(i) {
      i.size = i.size || 3;
      i.qty = i.qty || 1;
      return i;
    });
    var data = [{
      pickup_location: {
        lat: pickupMarker.position.lat(),
        lng: pickupMarker.position.lng()
      },
      delivery_location: {
        lat: deliveryMarker.position.lat(),
        lng: deliveryMarker.position.lng()
      },
      items: items
    }];
  }

  /*
    Function: drawRoute(location_ini, location_end)
    Description: Renders the line between two given points in the map
  */
  function drawRoute(location_ini, location_end) {
    var path = new google.maps.MVCArray();
    var service = new google.maps.DirectionsService();
    if (poly) {
      poly.setMap(null);
      poly = null;
    }
    poly = new google.maps.Polyline({
      map: map,
      strokeColor: '#E25050'
    });
    path.push(location_ini);
    poly.setPath(path);
    service.route({
      origin: location_ini,
      destination: location_end,
      travelMode: google.maps.DirectionsTravelMode.DRIVING
    }, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        for (var i = 0, len = result.routes[0].overview_path.length; i < len; i++) {
          path.push(result.routes[0].overview_path[i]);
        }
        path.push(location_end);
      }
    });
  }
  /*
    Function: geocodeLatLng(tuple_containing_latitude_longitude)
    Description: Sets the address given a tuple of latitude and longitude
  */
  function geocodeLatLng(lat_long) {
    var latlng = {
      lat: parseFloat(lat_long.lat()),
      lng: parseFloat(lat_long.lng())
    };
    geocoder.geocode({
      'location': latlng
    }, function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        if (results[0]) {
          $("#ship-street").val(" " + results[0].formatted_address);
          task.deliver.address = results[0].formatted_address;
          $(Widget).trigger('task', task);
        } else {
          $("#ship-street").val("");
        }
      } else {
        $("#ship-street").val("");
      }
    });
  }

  function geocodeAddress(address,result){
    geocoder.geocode({'address': address}, function(results, status) {
      return result(results);
    });
  }

  ///FUNCIONES DEPENDIENTES
  /*
    Function: sendDrawPickup(latitude, longitude, deliveryLocation)
    Description: Sets the pickup marker and draws the line between the pickup and delivery
  */
  function sendDrawPickup(lat, lng, deliveryLocation) {
    var icon_pickup = RESOURCE_URL+ "/images/marker_dot_awesomef.png";
    var pickupLocation = new google.maps.LatLng(lat, lng);
    if (pickupMarker) {
      pickupMarker.setMap(null);
      pickupMarker = null;
    }
    pickupMarker = new google.maps.Marker({
      icon: icon_pickup,
      position: pickupLocation
    });
   // drawRoute(pickupLocation, deliveryLocation);
    $("#shippify_ship_button").prop('disabled', false);
    didClickSubmitInput(pickupMarker);
  }

  /*
    Function:
       cxzc(deliveryLocation)
    Description: Calculate the latitude and longitude from the marker put in the map
  */
  function getCalculo(deliveryLocation) {
    task.deliver = {
      lat: deliveryLocation.lat(),
      lng: deliveryLocation.lng()
    };
    $(Widget).trigger('task', task);
    if (fixedPickup) {
      sendDrawPickup(task.pickup.lat, task.pickup.lng, deliveryLocation);
    } else {
      var data = {
        location: {
          lat: deliveryLocation.lat(),
          lng: deliveryLocation.lng()
        }
      };
      var credentials= API_ID+ ":" +API_TOKEN;
      $.ajax({
        type: "GET",
        url: API_URL + "/companies/" + company + "/warehouses/nearest",
        dataType: "json",
        data: data,
        beforeSend: function(xhr) {
          xhr.setRequestHeader("Authorization", "Basic" + btoa(credentials));
        },
        success: function(response) {
          printInConsole(response);
          if (response.errFlag != 0) {
            printInConsole(response.errMsg);
            return;
          };
          task.pickup = {
            lat: response.data.lat,
            lng: response.data.lng,
            address: response.data.location.address
          };
          $(Widget).trigger('task', task);
          sendDrawPickup(response.data.lat, response.data.lng, deliveryLocation);
        },
        error: function(error) {
          printInConsole(error.message)
        }
      });
    }
  }

  function distance(lat1, lon1, lat2, lon2) {
    var radlat1 = Math.PI * lat1/180
    var radlat2 = Math.PI * lat2/180
    var theta = lon1-lon2
    var radtheta = Math.PI * theta/180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180/Math.PI
    dist = dist * 60 * 1.1515;
    dist = dist * 1.609344;
    return dist;
  }

  /*
    Function: addDeliveryMarker(latitude-longitude)
    Description: Renders the delivery marker and sets its properties
  */
  function addDeliveryMarker(lag_lng) {
    var deliveryLocation = new google.maps.LatLng(parseFloat(lag_lng.lat()), parseFloat(lag_lng.lng()));
    if (deliveryMarker) {
      deliveryMarker.setMap(null);
      deliveryMarker = null;
    }
    var icon_delivery = RESOURCE_URL+"/images/marker.png";
    deliveryMarker = new google.maps.Marker({
      map: map,
      draggable: true,
      title: moveDelivery,
      icon: icon_delivery,
      animation: google.maps.Animation.DROP,
      position: deliveryLocation
    });
    bounds.extend(deliveryLocation);
    map.fitBounds(bounds);
    setTimeout(function(){
      try{
        map.setZoom(15);
        map.setCenter(deliveryLocation);
      }catch(error){
        printInConsole('Error:'+JSON.stringify(error));
      }
    },300);
    google.maps.event.addListener(deliveryMarker, 'dragend', function() {
      deliveryMarker.setAnimation(null);
      var markerLatLng = deliveryMarker.getPosition();
      geocodeLatLng(markerLatLng);
      printInConsole(markerLatLng);
      getCalculo(markerLatLng);
    });
    getCalculo(deliveryLocation);
  }

  /*
    Function: initMap()
    Description: Sets the configuration of the widget. Initializes inputs, renders map and binds actions
  */
  function initMap() {

      bounds = new google.maps.LatLngBounds();
      var cityLocation = new google.maps.LatLng(city_location.lat, city_location.lng);
      //Set the autocomplete property to the address input
      var googleAutocompleteAddress = new google.maps.places.Autocomplete(document.getElementById("ship-street"));

      geocoder = new google.maps.Geocoder;
      infowindow = new google.maps.InfoWindow;
      map = new google.maps.Map(document.getElementById("shippify_map_canvas"), {
        center: {
          lat: city.lat,
          lng: city.lng
        },
        zoomControl: true,
        zoom: 8,
        styles: [
          {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#af3740"
              }
            ]
          },
          {
            "featureType": "administrative.province",
            "elementType": "all",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [
              {
                "saturation": -100
              },
              {
                "lightness": 65
              },
              {
                "visibility": "on"
              }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "all",
            "stylers": [
              {
                "saturation": "-100"
              },
              {
                "lightness": 51
              },
              {
                "visibility": "simplified"
              }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "labels",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [
              {
                "saturation": "-100"
              },
              {
                "visibility": "simplified"
              }
            ]
          },
          {
            "featureType": "road.arterial",
            "elementType": "all",
            "stylers": [
              {
                "saturation": -100
              },
              {
                "lightness": 30
              },
              {
                "visibility": "on"
              }
            ]
          },
          {
            "featureType": "road.local",
            "elementType": "all",
            "stylers": [
              {
                "saturation": -100
              },
              {
                "lightness": 40
              },
              {
                "visibility": "on"
              }
            ]
          },
          {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [
              {
                "saturation": "-100"
              },
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
              {
                "lightness": -25
              },
              {
                "saturation": -97
              },
              {
                "color": "#666666"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "labels",
            "stylers": [
              {
                "visibility": "on"
              },
              {
                "lightness": -25
              },
              {
                "saturation": -100
              }
            ]
          }
        ]
      });


      googleAutocompleteAddress.bindTo("bounds", map);
      if(task.deliver!=undefined &&task.deliver.lat!=undefined &&task.deliver.lng!=undefined &&parseFloat(task.deliver.lat)!=0 && parseFloat(task.deliver.lng)!=0){
        console.log('Task  lat:',task.deliver.lat,' lng:',task.deliver.lng);
        cityLocation = new google.maps.LatLng(parseFloat(task.deliver.lat), parseFloat(task.deliver.lng));
      }else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position){
              var pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
              };
              cityLocation = new google.maps.LatLng(parseFloat(position.coords.latitude), parseFloat(position.coords.longitude));
          }, function() {

              addDeliveryMarker(cityLocation);
              animateBounce(deliveryMarker);
              var markerLatLng = deliveryMarker.getPosition();
              geocodeLatLng(markerLatLng);
              printInConsole(markerLatLng);
              getCalculo(markerLatLng);
          });
      }else{
         printInConsole("Browser doesn't support Geolocation");
      }

      addDeliveryMarker(cityLocation);
      animateBounce(deliveryMarker);
      if(task.deliver!=undefined&&task.deliver.address!=undefined){
        $("#ship-street").val(" "+task.deliver.address);
      }else{
        geocodeLatLng(cityLocation);
      }
      if(task.recipient!=undefined&&task.recipient.name!=undefined){
        $("#ship-name").val(" "+task.recipient.name);
      }
      getCalculo(cityLocation);
      bounds.extend(cityLocation);
      google.maps.event.addListener(googleAutocompleteAddress, "place_changed", function() {
        var place = googleAutocompleteAddress.getPlace();
        if (!place) {
          printInConsole("Location error");
          return;
        }
        if (!place.geometry) {
          printInConsole("Location error");
          return;
        }
        if (!place.geometry.location) {
          printInConsole("Location error");
          return;
        }
        printInConsole('Location');
        printInConsole(place.geometry.location.lat());
        printInConsole(place.geometry.location.lng());
        addDeliveryMarker(place.geometry.location);
        task.deliver.address = $("#ship-street").val();
        $(Widget).trigger('task', task);
      }, 0);
      map.addListener('bounds_changed', function() {
          if(validateTask(task)){
            enableOrDisableButton(true);
          }
      });
      map.addListener('zoom_changed', function() {
          if(validateTask(task)){
            enableOrDisableButton(true);
          }
      });
  }


  ///Initialization
  /*
    Function: initialize()
    Description: Initializes widget and sets update action
  */
  function initialize() {

    initMap();
    task;
    if($("#ship-street").length<=0){
      task.deliver.address = $("#ship-street").val();
      $(Widget).trigger('task', task);
    }
    $("#ship-street").on('input.success',function(){
      if(task.deliver==undefined){
        task.deliver={}
      }
      task.deliver.address = $("#ship-street").val();
      $(Widget).trigger('task', task);
    });
    $("#ship-street").blur(function(){
      if(task.deliver==undefined){
        task.deliver={}
      }
      task.deliver.address = $("#ship-street").val();
      $(Widget).trigger('task', task);
    });
    if($("#ship-name").length<=0){
      task.recipient.name = $("#ship-name").val();
      $(Widget).trigger('task', task);
    }
    $("#ship-name").on('input.success',function(){
      if(task.recipient==undefined){
        task.recipient={}
      }
      task.recipient.name = $("#ship-name").val();
      $(Widget).trigger('task', task);
    });
    $("#ship-name").blur(function(){
      if(task.recipient==undefined){
        task.recipient={}
      }
      task.recipient.name = $("#ship-name").val();
      $(Widget).trigger('task', task);
    });
    if($("#ship-number").length<=0){
      task.extra = JSON.stringify({note:($("#ship-number").val()!=undefined?numberHouse+" "+$("#ship-number").val():"")+" "+($("#ship-more-info").val()!=undefined?" - "+$("#ship-more-info").val():"")});
      $(Widget).trigger('task', task);
    }
    $("#ship-number").on('input.success',function(e){
      task.extra = JSON.stringify({note:($("#ship-number").val()!=undefined?numberHouse+" "+$("#ship-number").val():"")+" "+($("#ship-more-info").val()!=undefined?" - "+$("#ship-more-info").val():"")});
      $(Widget).trigger('task', task);
    });
    $("#ship-number").blur(function(){
      task.extra = JSON.stringify({note:($("#ship-number").val()!=undefined?numberHouse+" "+$("#ship-number").val():"")+" "+($("#ship-more-info").val()!=undefined?" - "+$("#ship-more-info").val():"")});
      $(Widget).trigger('task', task);
    });
    if($("#ship-more-info").length<=0){
      task.extra = JSON.stringify({note:($("#ship-number").val()!=undefined?numberHouse+" "+$("#ship-number").val():"")+" "+($("#ship-more-info").val()!=undefined?" - "+$("#ship-more-info").val():"")});
      $(Widget).trigger('task', task);
    }
    $("#ship-more-info").on('input.success',function(){
      task.extra = JSON.stringify({note:($("#ship-number").val()!=undefined?numberHouse+" "+$("#ship-number").val():"")+" "+($("#ship-more-info").val()!=undefined?" - "+$("#ship-more-info").val():"")});
      $(Widget).trigger('task', task);
    });
    $("#ship-more-info").blur(function(){
      task.extra = JSON.stringify({note:($("#ship-number").val()!=undefined?numberHouse+" "+$("#ship-number").val():"")+" "+($("#ship-more-info").val()!=undefined?" - "+$("#ship-more-info").val():"")});
      $(Widget).trigger('task', task);
    });
  }
  /*
    Funtion: addGoogleMapLibs()
    Description: Verifies if the google API exists. If not, adds it to the head of the page as a script and initializes the widget
  */
  function addGoogleMapLibs(){
    var googleMapImport = "<script type=\"text/javascript\" id='googleMapScript' src=\"https://maps.googleapis.com/maps/api/js?key=AIzaSyDRAKkei2ZjpBYJYbYESEQbaCnVlObH5m0&libraries=places&callback=initialize\"><\/script>";
     isEditTask=true;
    //INITIALIZING GOOGLE API
    var len = $('script[src*="https://maps.googleapis.com/maps/api/js?libraries=places&callback=initialize"]').length;
    var googleScript = $('#googleMapScript');
    if(!window.google){
      $('head').append(googleMapImport);
    }else{
      initialize();
    }
 }
  /*
    Function: includeJQueryIfNeeded(callback)
    Description: Verifies if JQuery lib is already loaded. If not, adds it to the head of the page
  */
  function includeJQueryIfNeeded(onSuccess) {
    if (typeof jQuery == 'undefined') {
      getScript('https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js', function() {
        if (typeof jQuery == 'undefined') {
          printInConsole("Not ready");
        } else {
          printInConsole("Ready jquery");
          onSuccess();
        }
      });
    } else {
      printInConsole("Ready");
      onSuccess();
    }
  }

  function createCookie(name,value,days) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
  }

  function validateTask(task){
    try{
      if(task.products.length<=0){
        return false;
      }else if(task.recipient==undefined){
        return false;
      }else if(task.recipient.name==undefined||task.recipient.name==null){
        return false;
      }else if(task.recipient.email==undefined||task.recipient.email==null){
        return false;
      }else if(task.recipient.phone==undefined||task.recipient.phone==null){
        return false;
      }else if(task.pickup==undefined){
        return false;
      }else if(task.pickup.address==undefined||task.pickup.address==null){
        return false;
      }else if(task.pickup.lat==undefined||task.pickup.lat==null){
        return false;
      }else if(task.pickup.lng==undefined||task.pickup.lng==null){
        return false;
      }else if(task.deliver==undefined){
        return false;
      }else if(task.deliver.address==undefined||task.deliver.address==null){
        return false;
      }else if(task.deliver.lat==undefined||task.deliver.lat==null){
        return false;
      }else if(task.deliver.lng==undefined||task.deliver.lng==null){
        return false;
      }else if(task.send_email_params==undefined){
        return false;
      }else if(JSON.parse(task.send_email_params).from==undefined||JSON.parse(task.send_email_params).from==null){
        return false;
      }else if(JSON.parse(task.send_email_params).subject==undefined||JSON.parse(task.send_email_params).subject==null){
        return false;
      }else if(JSON.parse(task.send_email_params).to==undefined||JSON.parse(task.send_email_params).to==null){
        return false;
      }else if(distance(parseFloat(task.pickup.lat),parseFloat(task.pickup.lng),parseFloat(task.deliver.lat), parseFloat(task.deliver.lng))>parseFloat(MAX_DISTANCE)){
        return false;
      }else{
        return true;
      }
    }catch(error){
      printInConsole(error);
      return false;
    }
  }

  function getShippinfDataSaved(){
    try{
      intents++;
      vtexjs.checkout.getOrderForm().done(function(order){
      orderId=order.orderFormId;
      printInConsole(order);
      printInConsole(order.orderFormId);
      printInConsole(orderId);
      try{
        printInConsole('From vtext -> selectedSla:',order.shippingData.logisticsInfo[0].selectedSla);
        if(SHIPPING_NAME.indexOf(''+order.shippingData.logisticsInfo[0].selectedSla)>=0&&order.shippingData.logisticsInfo[0].selectedSla!=""){
          $("#payment-data-submit").attr({
            "onclick": "sendServer()"
          });
          if(order.clientProfileData==undefined){
            order.clientProfileData={};
          }
          if(order.shippingData==undefined){
            order.shippingData={};
            order.shippingData.address={};
          }
          var name="";
          if(order.shippingData.address!=undefined&&order.shippingData.address.receiverName!=undefined&&order.shippingData.address.receiverName!=null){
            name=order.shippingData.address.receiverName;
          }else{
            name=(order.clientProfileData.firstName!=undefined?order.clientProfileData.firstName:"")+" "+(order.clientProfileData.lastName!=undefined?order.clientProfileData.lastName:"");
          }
          var email=(order.clientProfileData.email!=undefined?order.clientProfileData.email:"");
          var phone="";
          if(order.clientProfileData.phone){
            if(order.clientProfileData.phone.number){
              phone=order.clientProfileData.phone.number;
            }else{
              phone=order.clientProfileData.phone;
            }
          }
          var address=((order.shippingData.address.street!=undefined&&order.shippingData.address.street!=null)?order.shippingData.address.street:"");
          var delivery_lat=((order.shippingData.address.reference!=null&&order.shippingData.address.reference!=undefined&&order.shippingData.address.reference.includes(","))?order.shippingData.address.reference.split(",")[0]:"0");
          var delivery_lng=((order.shippingData.address.reference!=null&&order.shippingData.address.reference!=undefined&&order.shippingData.address.reference.includes(","))?order.shippingData.address.reference.split(",")[1]:"0");
          var products=((order.items.length>0)?order.items.map(function(item){
            var product={};
            product["id"]=item.id;
            product["name"]=item.name;
            product["qty"]=item.quantity;
            product["size"]=2;
            getProductBySku('https',item.id);
            return product;
          }):[]);
          taskObj= generateTASKObj({name:name, email:email, phone:phone, address:address, country:country, city:city, delivery_lat:delivery_lat,delivery_lng:delivery_lng}, products);
        }
      }catch(error){
        printInConsole(error);
      }

    }).fail(function(){
      printInConsole('Problems with endpoint from vtex');
    });
    }catch(err){
      console.error(err);
      if(intents<20){
        setTimeout(function(){getShippinfDataSaved()},200);
      }
    }
  }

  function getProductBySku(protocol,skuId){
    $.ajax({
      url     : protocol+"://"+API_URL_SKU+skuId,
      type    : "GET",
      dataType: "json",
      crossDomain: true,
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Content-Type", "application/json; charset=utf-8");
        xhr.setRequestHeader ("Accept", "application/json");
        xhr.setRequestHeader ("X-VTEX-API-AppKey", X_VTEX_API_APPKEY);
        xhr.setRequestHeader ("X-VTEX-API-AppToken", X_VTEX_API_APPTOKEN);
      },
      success : function(respObj){
        var arraySize=[1,2,3,4,5];//available size;
        var arrayDimensions=SIZE_FOR_DIMENSIONS.map(function(item){return Number(item);});//available size;
        var dimensionsArray=AVAILABLE_DIMENSIONS;
        var ratioMembership=Number(RADIO_DIMENTION);
        if(taskObj==undefined){
          taskObj={};
          printInConsole('taskObj:'+JSON.stringify(taskObj));
          return;
        }
        if(taskObj.products==undefined){

          taskObj.products=[];
          return;
        }
        taskObj.products.forEach(function(product){

          var optionsSize=arraySize.map(function(size){
            var percentage=0;
            var maxPercentage=(100/dimensionsArray.length);

            //Function for Measure fuzzy.
            dimensionsArray.forEach(function(dimension){
              if(respObj.Dimension[dimension]<arrayDimensions[size-1]){
                percentage+=maxPercentage;
              }else if(respObj.Dimension[dimension]<(arrayDimensions[size-1]+ratioMembership)){
                var preResult=(1-(Math.abs(arrayDimensions[size-1]-respObj.Dimension[dimension])/(2*ratioMembership)));
                var tmpP=preResult<0?0:preResult;

                percentage+=(((preResult*100)*maxPercentage)/100); // Measure fuzzy.
              }else{
                percentage+=0;// Probality 0 for this dimension.
              }
            });
            return {percentage:percentage,size:size};
          })
          .sort(function (lhs, rhs) {
            return lhs.percentage > rhs.percentage ? -1 : lhs.percentage < rhs.percentage ? 1 : 0;
          });


          product.size=optionsSize[0];//The best option like a size.

        });
      },
      error : function(errorObj){
        printInConsole(JSON.stringify(errorObj));
        getProductBySku('http',skuId);
      }
    });
  }



  function basicAjaxRequestJSONP(methodName, endpointUrl,dataObj,onSuccess,onError){
    $.ajax({
      url     : endpointUrl,
      type    : methodName,
      dataType: "json",
      crossDomain: true,
      data    : dataObj,
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization", "Basic " + btoa(API_ID+":"+API_TOKEN));
      },
      success : function(respObj){
        printInConsole("Servidor Respondio");
        onSuccess(respObj);
      },
      error : function(errorObj){
        printInConsole("error en la peticion "+JSON.stringify(errorObj));
        printInConsole("Error:"+JSON.stringify(onError));
          if(onError){
            onError(errorObj);
          }
      }
    });
  }

  //Adding the function to the button at checkout to create a pending payment task in the server

  function sendServer(){
    isEditTask=false;
    printInConsole(" POST CROSDOMAIN: "+ orderId);
    printInConsole(" TASK TO SEND TO SERVER: "+JSON.stringify(taskObj));
    vtexjs.checkout.getOrderForm().done(function(orderForm){
      try{
        var order=convertTaskToOrder(taskObj,orderId);
        order.price=orderForm.shippingData.logisticsInfo[0].slas[0].price
        var method ='POST';
        var endpointUrl=API_URL+'/orders';
        var dataObj = { "order":order};
        printInConsole('Order:'+JSON.stringify(dataObj,null,4));
        basicAjaxRequestJSONP(method,endpointUrl,dataObj,function(successObj){
          isEditTask=false;
          //For debug
          printInConsole("Order saved");
          //A cookie containing the Order ID is created so when the payment is confirmed, the task is sent to the dash
          createCookie("orderIdPassed", orderId, 1);
        },function(errorObj){
          isEditTask=true;
          printInConsole(" Error to get JSON "+JSON.stringify(errorObj));
        });
      }catch(error){
        console.error('Error:',error);
      }
    });
  }



  function convertTaskToOrder(task,orderId){
    var order={
        "platform":"vtex",
        "dropoff":{
          "contact":{
            "email":task.recipient.email,
            "name":task.recipient.name,
            "phone":task.recipient.phone
          },
          "location":{
            "address":task.deliver.address,
            "latitude":task.deliver.lat,
            "longitude":task.deliver.lng
          },
          "specialInstructions":((task.extra)?JSON.parse(task.extra).note:undefined)
        },
        "id":orderId,
        "items":task.products.map(function(product){
          var item={};
          item.name=product.name;
          item.size=product.size.size;
          item.quantity=product.qty;
          return item;
         }),
        "pickup":{
          "contact":{
            "email":JSON.parse(task.send_email_params).from,
            "name":JSON.parse(task.send_email_params).subject
          },
          "location":{ // (object, optional)
            "address":task.pickup.address,
            "latitude":task.pickup.lat,
            "longitude":task.pickup.lng
          }
        }
      }
      return order;
  }

  ///Widget declaration
  var Widget = function () {
    this.json;
    this.node;
    this.task;

    this.init = function (json, node, onSuccess) {
      this.json = json;
      this.node = node;
      task = json.task;
      includeJQueryIfNeeded(function () {
        ///Used scripts and external dependencies
        var dependencies = "<link href=\"https://fonts.googleapis.com/icon?family=Material+Icons\" rel=\"stylesheet\">";
        var styles = "<style>#shippify_map_canvas {  width: 100%;  height: 100%;}.iti-flag {background-image: url('"+RESOURCE_URL+"/images/flags.png') !important; }</style>";

        var widgetPreviewContainer = "<div id=\"widget_view_container\" class=\"submenu_view\" style=\"margin: 0 !important;\"><div id=\"reportsView_body\"><div class=\"widget_preview_container\"><div class=\"widget_card\"><div class=\"widget_map_preview\" ><div id=\"shippify_map_canvas\"></div></div></div></div></div></div>";

        ///Adding the dependencies, styles and containers to the window
        var appended =styles+ widgetPreviewContainer+ dependencies;
        $(node).html(appended);
        addGoogleMapLibs();
        onSuccess(null, Widget);

      });
    };
  }
  window.Widget = Widget;



$(document).ready(function () {
 	onShipping();
});

$(document).ready(function () {
	onPayment();
});

function onShipping(){
    if(window.location.href.indexOf("shipping") > -1&&enableMap) {

		  var orderId = null;
		  var cartProducts = PRODUCTS;
		  var products=[];
		  var referenceTemporal;

		  getShippinfDataSaved();

		  for(var i=0; i < cartProducts.length; i++){
		    var product={};
		    product["id"]=cartProducts[i].id;
		    product["name"]=cartProducts[i].name;
		    product["qty"]=cartProducts[i].quantity;
		    product["size"]=1;
		    getProductBySku('https',cartProducts[i].id);
		    products.push(product);
		  }

		  var widget_view="<div class='shippify_delivery delivery_option' id='widget_presentation'><div class='deliveryOpt_shippify shippify_opt'><div id='canvas_widget'></div></div></div></div>";

		  var widget_added=false;
		  var isMyevent=false;

		  subcribeChanges();
		  function subcribeChanges(without){
		    if(without==undefined){
		      unSubcribeChanges();
		    }
		    printInConsole('Subscribing...');
		    $(".shipping-data").bind("DOMSubtreeModified",function(){
		        printInConsole('Country hidden: '+$('input[name=country]').val());
		        if($('input[name=country]').val()!=undefined){
		          country=$('input[name=country]').val();
		          validationToCountry();
		        }
		    });
		  }

		  function unSubcribeChanges(){
		    printInConsole('Unsubscribing...');
		    $(".shipping-data").unbind("DOMSubtreeModified");
		  }

		  function validationToCountry(){
		    printInConsole('Countries registed in shippify service :'+JSON.stringify(COUNTRIES));
		    if(COUNTRIES.indexOf(country.trim())>=0){
		      printInConsole('This country selected have Shippify Service.');
		      unSubcribeChanges();

		      var focus_city=false;
		      if($(".ship-city").is(":focus")){
		        printInConsole('Focus in city')
		        focus_city=true;
		      }
		      $(".ship-city").prependTo(".box-delivery");
		      if(focus_city) {
		        printInConsole('Setting Focus in city');
		        $(".ship-city").focus();
		      }

		      $(".ship-state").prependTo(".box-delivery");
		      $("p.ship-city").attr("style", "float:none;");
		      if($(".address-shipping-options").length){
		        printInConsole('Shippify options renderized');
		        $(".address-shipping-options").insertAfter( ".country-select-placeholder" );
		      }
		      printInConsole('City selected :'+$('#ship-city').val());
		      city=$('#ship-city').val();
		      state=$('#ship-state').val();
		      if(city!=undefined&&city!=null&&state!=undefined&&state!=null){
		         printInConsole('State to check:'+JSON.stringify(STATES));
		         printInConsole('Cities to check:'+JSON.stringify(CITIES));
		        if(CITIES.indexOf(city.trim())>=0||STATES.indexOf(state.trim())>=0){
		          printInConsole('This city selected have Shippify Service.');
		          if($('#seller-1-sla-'+SHIPPING_NAME[0]+'').is(':checked')||(SHIPPING_NAME.length>1&&$('#seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'').is(':checked'))){
		            printInConsole('Is Checked');
		            enableOrDisableButton(true);//Disable until the widget change this status.
		            createWidget();
		          }else{
		            printInConsole("Shippify services is not selected");
		            removeWidget();
		            eraseCookie("orderIdPassed");
		            $(document).off('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[0]+'"]');
		            $(document).on('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[0]+'"]', function(){
		              printInConsole('Is Checked from onclick');
		              enableOrDisableButton(true);//Disable until the widget change this status.
		              createWidget();
		            });
		            if(SHIPPING_NAME.length>1){
		              $(document).off('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'"]');
		              $(document).on('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'"]', function(){
		                printInConsole('Is Checked from onclick');
		                enableOrDisableButton(true);//Disable until the widget change this status.
		                createWidget();
		              });
		            }
		            enableOrDisableButton(true);
		          }
		        }else{
		          printInConsole("This city selected don't have Shippify Service.");
		          $(document).off('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[0]+'"]');
		          $(document).on('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[0]+'"]', function(){
		             city=$('#ship-city').val();
		             state=$('#ship-state').val();
		             if(city!=undefined&&state!=undefined&&CITIES.indexOf(city.trim())>=0||STATES.indexOf(state.trim())>=0){
		                printInConsole('Is Checked from onclick');
		                enableOrDisableButton(true);//Disable until the widget change this status.
		                createWidget();
		             }else{
		                removeWidget();
		                if($('#seller-1-sla-'+SHIPPING_NAME[0]+'').is(':checked')){
		                  printInConsole('Is Checked but city is incorrect');

		                  enableOrDisableButton(false);//Disable until the widget change this status.
		                }else{
		                  enableOrDisableButton(true);
		                }
		                eraseCookie("orderIdPassed");
		                printInConsole("This city selected don't have Shippify Service.");
		             }
		          });
		          if(SHIPPING_NAME.length>1){
		            $(document).off('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'"]');
		            $(document).on('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'"]', function(){
		               city=$('#ship-city').val();
		               state=$('#ship-state').val();
		               if(city!=undefined&&state!=undefined&&CITIES.indexOf(city.trim())>=0||STATES.indexOf(state.trim())>=0){
		                  printInConsole('Is Checked from onclick');
		                  enableOrDisableButton(true);//Disable until the widget change this status.
		                  createWidget();
		               }else{
		                  removeWidget();
		                  if($('#seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'').is(':checked')){
		                    printInConsole('Is Checked but city is incorrect');
		                    enableOrDisableButton(false);//Disable until the widget change this status.
		                  }else{
		                    enableOrDisableButton(true);
		                  }
		                  eraseCookie("orderIdPassed");
		                  printInConsole("This city selected don't have Shippify Service.");
		               }
		            });
		          }
		          removeWidget();
		          if($('#seller-1-sla-'+SHIPPING_NAME[0]+'').is(':checked')){
		            printInConsole('Is Checked but city is incorrect');
		            eraseCookie("orderIdPassed");
		            enableOrDisableButton(false);//Disable until the widget change this status.
		          }else{
		            enableOrDisableButton(true);
		          }
		          if(SHIPPING_NAME.length>1){
		            if($('#seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'').is(':checked')){
		              printInConsole('Is Checked but city is incorrect');
		              enableOrDisableButton(false);//Disable until the widget change this status.
		            }else{
		              enableOrDisableButton(true);
		            }
		          }
		        }
		      }else{
		        removeWidget();
		        if($('#seller-1-sla-'+SHIPPING_NAME[0]+'').is(':checked')){
		          printInConsole('Is Checked but city is incorrect');
		          eraseCookie("orderIdPassed");
		          enableOrDisableButton(false);//Disable until the widget change this status.
		        }else{
		          enableOrDisableButton(true);
		        }
		        if(SHIPPING_NAME.length>1){
		          if($('#seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'').is(':checked')){
		            printInConsole('Is Checked but city is incorrect');
		            eraseCookie("orderIdPassed");
		            enableOrDisableButton(false);//Disable until the widget change this status.
		          }else{
		            enableOrDisableButton(true);
		          }
		        }
		      }
		    }else{
		      //This case the widget shouln't be show it.
		      removeWidget();
		      enableOrDisableButton(true);
		      $(document).off('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[0]+'"]');
		      if(SHIPPING_NAME.length>1){
		        $(document).off('click', 'label.shipping-option-item[for="seller-1-sla-'+SHIPPING_NAME[SHIPPING_NAME.length-1]+'"]');
		      }
		      eraseCookie("orderIdPassed");
		      printInConsole("This country selected don't have Shippify Service.");
		    }
		  }

		  function enableOrDisableButton(isChecked) {
		    unSubcribeChanges();
		    if(isChecked==true){
		      printInConsole('ENABLE PAYMENT BUTTON ');
		      document.getElementsByClassName("btn-go-to-payment")[0].removeAttribute("disabled");
		    }else{
		      printInConsole('DISABLE PAYMENT BUTTON ');
		      $(".btn-go-to-payment").attr("disabled", "true")//.button('refresh');
		    }
		    subcribeChanges();
		  }

		  function removeWidget(){
		    printInConsole('Removing widget');
		    widget_added=false;
		    $("#widget_presentation").remove();
		  }

		  function disableEdit(){
		    printInConsole('disabled');
		    isEditTask=false;
		  }

		  function createWidget(){
		    if((widget_added==false||$('#widget_presentation').length<=0)&&!$('#force-shipping-fields:visible').length){
		      widget_added=true;
		      unSubcribeChanges();
		      $('#widget_presentation').remove();
		      if(!($('#ship-reference').hasClass( "hide" ))){
		        $('#ship-reference').addClass("hide");
		      }
		      $(".box-delivery").prepend($(widget_view));
		      address_g = $("#ship-street").val();

		      vtexjs.checkout.getOrderForm().done(function(order){
		        orderId=order.orderFormId;
		        printInConsole(order);
		        printInConsole(order.orderFormId);
		        printInConsole(orderId);
		        if(order.clientProfileData==undefined){
		          order.clientProfileData={};
		        }
		        if(order.shippingData==undefined){
		          order.shippingData={};
		          order.shippingData.address={};
		        }
		        var name="";
		        if(order.shippingData.address!=undefined&&order.shippingData.address.receiverName!=undefined&&order.shippingData.address.receiverName!=null){
		          name=order.shippingData.address.receiverName;
		        }else{
		          name=(order.clientProfileData.firstName!=undefined?(order.clientProfileData.firstName+" "):"")+""+(order.clientProfileData.lastName!=undefined?order.clientProfileData.lastName:"");
		        }
		        var email=(order.clientProfileData.email!=undefined?order.clientProfileData.email:"");
		        var phone="";
		        if(order.clientProfileData.phone){
		          if(order.clientProfileData.phone.number){
		            phone=order.clientProfileData.phone.number;
		          }else{
		            phone=order.clientProfileData.phone;
		          }
		        }
		        var address=((order.shippingData.address.street!=undefined&&order.shippingData.address.street!=null)?order.shippingData.address.street:"");
		        var delivery_lat=referenceTemporal!=undefined?referenceTemporal.split(",")[0]:((order.shippingData.address.reference!=null&&order.shippingData.address.reference!=undefined&&order.shippingData.address.reference.includes(","))?order.shippingData.address.reference.split(",")[0]:"0");
		        var delivery_lng=referenceTemporal!=undefined?referenceTemporal.split(",")[1]:((order.shippingData.address.reference!=null&&order.shippingData.address.reference!=undefined&&order.shippingData.address.reference.includes(","))?order.shippingData.address.reference.split(",")[1]:"0");

		        var taskLocal= generateTASKObj({name:name, email:email, phone:phone, address:address, country:country, city:city, delivery_lat:delivery_lat,delivery_lng:delivery_lng}, products);
		        printInConsole('TASK OBJECT:',taskLocal);
		        printInConsole('Adding widget');
		        $("#ship-name").val(""+name);
		        new Widget().init({ api_id: API_ID, api_token:API_TOKEN, task: taskLocal },document.getElementById("canvas_widget"),
		          function(err, Widget) {
		            if (err){
		              widget_added=false;
		              printInConsole(err);
		            }
		            $(Widget).on("task", function(event, task) {
		              printInConsole("Update task :",task);

		              vtexjs.checkout.getOrderForm().then(function(orderForm){
		                  var shippingData = orderForm.shippingData;
		                  if(isEditTask==true){
                        var recipient_name = task.recipient.name.trim();
                        if(recipient_name == undefined || typeof recipient_name != 'string'){
                          return ;
                        }

                        if(task.city == undefined || typeof task.city != 'string'){
                          return ;
                        }

                        if(task.country == undefined || typeof task.country != 'string'){
                          return ;
                        }

                        if(task.deliver.address == undefined || typeof task.deliver.address != 'string'){
                          return ;
                        }

                        if(task.deliver.lat == undefined || typeof parseFloat(task.deliver.lat) != 'number'){
                          return ;
                        }

                        if(task.deliver.lng == undefined || typeof parseFloat(task.deliver.lng) != 'number'){
                          return ;
                        }

		                    shippingData.address.receiverName = recipient_name;
		                    shippingData.address.city = task.city;
		                    shippingData.address.country = task.country;
		                    shippingData.address.street=task.deliver.address;

		                    shippingData.address.reference=task.deliver.lat+","+task.deliver.lng;
		                    referenceTemporal=shippingData.address.reference;
		                  }
                      if(shippingData!=undefined){
                        return vtexjs.checkout.sendAttachment('shippingData', shippingData)
                      }
                      return;
		              }).done(function(orderForm){
		                  if(validateTask(task)){
		                    enableOrDisableButton(true);
		                    taskObj=task;
		                    $("#payment-data-submit").attr({
		                      "onclick": "sendServer()"
		                    });

		                    $(".btn-go-to-payment").attr({
		                      "onclick": "disableEdit()"
		                    });
		                    printInConsole('Valid task');
		                  }else{
		                    printInConsole('Not valid task');
		                  }
		              })
		            });
		            subcribeChanges();
		          });

		      }).fail(function(){
		        printInConsole('Problems with endpoint from vtex');
		      });
		    }else{
		      subcribeChanges();
		      printInConsole('Widget was added');
		    }
		  }
    }
}

function onPayment(){
    if((window.location.href.indexOf("payment") > -1)||(window.location.href.indexOf("profile") > -1)) {
       printInConsole("Remove... checkout");
		  if(taskObj==undefined){
		    var taskObj={};
		  }
		  isEditTask=false;
		  $("#widget_presentation").remove();

		  function getProductBySku(protocol,skuId){
		    $.ajax({
		      url     : protocol+"://"+API_URL_SKU+skuId,
		      type    : "GET",
		      dataType: "json",
		      crossDomain: true,
		      beforeSend: function (xhr) {
		        xhr.setRequestHeader ("Content-Type", "application/json; charset=utf-8");
		        xhr.setRequestHeader ("Accept", "application/json");
		        xhr.setRequestHeader ("X-VTEX-API-AppKey", X_VTEX_API_APPKEY);
		        xhr.setRequestHeader ("X-VTEX-API-AppToken", X_VTEX_API_APPTOKEN);

		      },
		      success : function(respObj){
		        var arraySize=[1,2,3,4,5];//available size;
		        var arrayDimensions=SIZE_FOR_DIMENSIONS.map(function(item){return Number(item);});//available size;
		        var dimensionsArray=AVAILABLE_DIMENSIONS;
		        var ratioMembership=Number(RADIO_DIMENTION);


		        taskObj.products.forEach(function(product){

		          var optionsSize=arraySize.map(function(size){
		            var percentage=0;
		            var maxPercentage=(100/dimensionsArray.length);

		            //Function for Measure fuzzy.
		            dimensionsArray.forEach(function(dimension){
		              if(respObj.Dimension[dimension]<arrayDimensions[size-1]){
		                percentage+=maxPercentage;
		              }else if(respObj.Dimension[dimension]<(arrayDimensions[size-1]+ratioMembership)){
		                var preResult=(1-(Math.abs(arrayDimensions[size-1]-respObj.Dimension[dimension])/(2*ratioMembership)));
		                var tmpP=preResult<0?0:preResult;

		                percentage+=(((preResult*100)*maxPercentage)/100); // Measure fuzzy.
		              }else{
		                percentage+=0;// Probality 0 for this dimension.
		              }
		            });
		            return {percentage:percentage,size:size};
		          })
		          .sort(function (lhs, rhs) {
		            return lhs.percentage > rhs.percentage ? -1 : lhs.percentage < rhs.percentage ? 1 : 0;
		          });


		          product.size=optionsSize[0];//The best option like a size.

		        });
		      },
		      error : function(errorObj){
		        printInConsole(JSON.stringify(errorObj));
		        getProductBySku('http',skuId);
		      }
		    });
		  }

		  function basicAjaxRequestJSONP(methodName, endpointUrl,dataObj,onSuccess,onError){
		    $.ajax({
		      url     : endpointUrl,
		      type    : methodName,
		      dataType: "json",
		      crossDomain: true,
		      data    : dataObj,
		      beforeSend: function (xhr) {
		        xhr.setRequestHeader ("Authorization", "Basic " + btoa(API_ID+":"+API_TOKEN));
		      },
		      success : function(respObj){
		        printInConsole("Servidor Respondio");
		        onSuccess(respObj);
		      },
		      error : function(errorObj){
		        printInConsole("error en la peticion "+JSON.stringify(errorObj));
		        if(onError){
		          onError(errorObj);
		        }
		      }
		    });
		  }

		  function validateTask(task){
		    try{
		      if(task.products.length<=0){
		        return false;
		      }else if(task.recipient==undefined){
		        return false;
		      }else if(task.recipient.name==undefined||task.recipient.name==null){
		        return false;
		      }else if(task.recipient.email==undefined||task.recipient.email==null){
		        return false;
		      }else if(task.recipient.phone==undefined||task.recipient.phone==null){
		        return false;
		      }else if(task.pickup==undefined){
		        return false;
		      }else if(task.pickup.address==undefined||task.pickup.address==null){
		        return false;
		      }else if(task.pickup.lat==undefined||task.pickup.lat==null){
		        return false;
		      }else if(task.pickup.lng==undefined||task.pickup.lng==null){
		        return false;
		      }else if(task.deliver==undefined){
		        return false;
		      }else if(task.deliver.address==undefined||task.deliver.address==null){
		        return false;
		      }else if(task.deliver.lat==undefined||task.deliver.lat==null){
		        return false;
		      }else if(task.deliver.lng==undefined||task.deliver.lng==null){
		        return false;
		      }else if(task.send_email_params==undefined){
		        return false;
		      }else if(JSON.parse(task.send_email_params).from==undefined||JSON.parse(task.send_email_params).from==null){
		        return false;
		      }else if(JSON.parse(task.send_email_params).subject==undefined||JSON.parse(task.send_email_params).subject==null){
		        return false;
		      }else if(JSON.parse(task.send_email_params).to==undefined||JSON.parse(task.send_email_params).to==null){
		        return false;
		      }else if(distance(parseFloat(task.pickup.lat),parseFloat(task.pickup.lng),parseFloat(task.deliver.lat), parseFloat(task.deliver.lng))>parseFloat(MAX_DISTANCE)){
		        return false;
		      }else{
		        return true;
		      }
		    }catch(error){
		      printInConsole(error);
		      return false;
		    }
		  }


		  function distance(lat1, lon1, lat2, lon2) {
		    var radlat1 = Math.PI * lat1/180
		    var radlat2 = Math.PI * lat2/180
		    var theta = lon1-lon2
		    var radtheta = Math.PI * theta/180
		    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		    dist = Math.acos(dist)
		    dist = dist * 180/Math.PI
		    dist = dist * 60 * 1.1515;
		    dist = dist * 1.609344;
		    return dist;
		  }

		  function convertTaskToOrder(task,orderId){
		    var order={
		        "platform":"vtex",
		        "dropoff":{
		          "contact":{
		            "email":task.recipient.email,
		            "name":task.recipient.name,
		            "phone":task.recipient.phone
		          },
		          "location":{
		            "address":task.deliver.address,
		            "latitude":task.deliver.lat,
		            "longitude":task.deliver.lng
		          },
		          "specialInstructions":((task.extra)?JSON.parse(task.extra).note:undefined)
		        },
		        "id":orderId,
		        "items":task.products.map(function(product){
		          var item={};
		          item.name=product.name;
		          item.size=product.size.size||3;
		          item.quantity=product.qty||1;
		          return item;
		         }),
		         "pickup":{
		          "contact":{
		            "email":JSON.parse(task.send_email_params).from,
		            "name":JSON.parse(task.send_email_params).subject
		          },
		          "location":{ // (object, optional)
		            "address":task.pickup.address,
		            "latitude":task.pickup.lat,
		            "longitude":task.pickup.lng
		          }
		        }
		      }
		      return order;
		  }

		  function sendServer(){
		    vtexjs.checkout.getOrderForm().done(function(orderForm){
		      try{
		        var order=convertTaskToOrder(taskObj,orderId);
		        order.price=orderForm.shippingData.logisticsInfo[0].slas[0].price
		        var method ='POST';
		        var endpointUrl=API_URL+"/orders";
		        var dataObj = { "order":order};
		        printInConsole('Order:'+JSON.stringify(order,null,4));
		        basicAjaxRequestJSONP(method,endpointUrl,dataObj,function(successObj){
		          isEditTask=false;
		          //For debug
		          //A cookie containing the Order ID is created so when the payment is confirmed, the task is sent to the dash
		          createCookie("orderIdPassed", orderId, 1);
		        },function(errorObj){
		          isEditTask=true;
		          printInConsole(" Error to get JSON "+JSON.stringify(errorObj));
		        });
		      }catch(error){
		        console.error('Error:',error);
		      }
		    });
		  }
		  getShippinfDataSaved();
    }
}

$(document).ready(function () {
    if(window.location.href.indexOf("orderPlaced") > -1) {
    	onReadyOrderPlaced();
    }
});

function onReadyOrderPlaced(){
  printInConsole("Loading... orderPlaced");
  function createCookie(name,value,days) {
    if (days) {
      var date = new Date();
      //Expiring cookie 24 hours after created
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
  }


  function retrieveServer(){
    var orderIdPassed = readCookie("orderIdPassed");
    printInConsole('orderIdPassed:'+orderIdPassed);
    if(orderIdPassed!=null&&orderIdPassed!="null"){
      getTempOrder(orderIdPassed,function(success){
        var method ='POST';
        var newOrder=$("#order-id").html();
        var endpointUrl= API_URL+'/orders/'+newOrder+'/confirm';
        var dataObj = {};
        retrieveAjaxRequestJSONP(method,endpointUrl,dataObj,function(successObj){
          printInConsole(" SEND POST RESPONSE >>> :"+JSON.stringify(successObj));
          eraseCookie("orderIdPassed");
        },function(errorObj){
          printInConsole(" Error to get JSON "+JSON.stringify(errorObj));
          retrieveServer();
        });
      },
      function(error){
        retrieveServer();
      });
    }
  }

  function getTempOrder(orderIdPassed,onSuccess,onError){
    var newOrder=$("#order-id").html();
    var endpointUrl= API_URL+'/orders/'+orderIdPassed;
    $.ajax({
      url     : endpointUrl,
      type    : 'GET',
      dataType: "json",
      crossDomain: true,
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization", "Basic " + btoa(API_ID+":"+API_TOKEN));
      },
      success : function(respObj){
        printInConsole(JSON.stringify(respObj));
        if(respObj.payload.order){
          respObj.payload.order.id=newOrder;
          setOrder(respObj.payload.order,onSuccess,onError);
        }
      },
      error : function(errorObj){
        printInConsole('Error:'+JSON.stringify(errorObj));
        if(onError){
          onError(errorObj);
        }
      }
    });
  }

  function setOrder(order,onSuccess,onError){
    $.ajax({
      url     : API_URL+"/orders",
      type    : 'POST',
      dataType: "json",
      crossDomain: true,
      data    : { "order":order},
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization", "Basic " + btoa(API_ID+":"+API_TOKEN));
      },
      success : function(respObj){
        onSuccess(respObj);
      },
      error : function(errorObj){
        printInConsole('Error:'+JSON.stringify(errorObj));
        if(onError){
          onError(errorObj);
        }
      }
    });
  }

  function retrieveAjaxRequestJSONP(methodName, endpointUrl,dataObj,onSuccess,onError){
    $.ajax({
      url     : endpointUrl,
      type    : methodName,
      dataType: "json",
      crossDomain: true,
      data    : dataObj,
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization", "Basic " + btoa(API_ID+":"+API_TOKEN));
      },
      success : function(respObj){
        onSuccess(respObj);
      },
      error : function(errorObj){
        printInConsole('Error:'+JSON.stringify(errorObj));
        if(onError){
          onError(errorObj);
        }
      }

    });
  }
  retrieveServer();
}
