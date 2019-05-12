var omvivaBinded = false;
var omnivaFilterCount = false;
var omnivaMap = {

  init : function(){
    var self = this;
      var omnivaCachedSearch = [];
//jQuery('document').ready(function(jQuery){
  var currentLocationIcon = false;
  var postcode = "";
  var autoSelectTerminal = false;
  jQuery('#omnivaMapContainer').html('<div id="omnivaMap"></div>');
  if (omniva_current_country == "LT"){
    var map = L.map('omnivaMap').setView([54.999921, 23.96472], 8);
  }
  if (omniva_current_country == "LV"){
    var map = L.map('omnivaMap').setView([55.5805933, 22.1592742], 8);
  }
  if (omniva_current_country == "EE"){
    var map = L.map('omnivaMap').setView([58.7952, 25.5923], 7);
  }
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.omniva.lt">Omniva</a>'
	}).addTo(map);

	var Icon = L.Icon.extend({
		options: {
			//shadowUrl: 'leaf-shadow.png',
			iconSize:     [29, 34],
			//shadowSize:   [50, 64],
			iconAnchor:   [15, 34],
			//shadowAnchor: [4, 62],
			popupAnchor:  [-3, -76]
		}
	});
  
  var Icon2 = L.Icon.extend({
		options: {
			iconSize:     [32, 32],
			iconAnchor:   [16, 32]
		}
	});
	var terminalIcon = new Icon({iconUrl: omnivadata.omniva_plugin_url+'sasi.png'});
  var homeIcon = new Icon2({iconUrl: omnivadata.omniva_plugin_url+'locator_img.png'});
  var select_terminal = omnivadata.select_terminal;
  var not_found = omnivadata.not_found;
  
  var locations = JSON.parse(omnivaTerminals);
    jQuery.each( locations, function( key, location ) {
      L.marker([location[1], location[2]], {icon: terminalIcon, terminalId:location[3] }).on('click',function(e){ listTerminals(locations,0,this.options.terminalId);terminalDetails(this.options.terminalId);}).addTo(map);
    });
  
  //show button
  jQuery('#show-omniva-map').show();
  if (!omvivaBinded){     
   
    jQuery('#omniva-search form').on('submit',function(e){
      e.preventDefault();
      var postcode = jQuery('#omniva-search form input').val();
      searchPostcode(postcode);
    });
  
    jQuery('#terminalsModal').on('click',function(){jQuery('#omnivaLtModal').hide();});
    jQuery('body').on('click','#show-omniva-map',showModal);
    
    jQuery('#shipping_postcode').on('change',function(){
      if (jQuery('#ship-to-different-address-checkbox').length > 0 && jQuery('#ship-to-different-address-checkbox').is(':checked')){
        postcode = jQuery(this).val();
        searchPostcode(postcode);
        autoSelectTerminal = true;
      }
    });
    jQuery('#billing_postcode').on('change',function(){
      if (jQuery('#ship-to-different-address-checkbox').length > 0 && !jQuery('#ship-to-different-address-checkbox').is(':checked')){
        postcode = jQuery(this).val();
        searchPostcode(postcode);
        autoSelectTerminal = true;
      }
    });
    
     omvivaBinded = true;
  }
  function showModal(){
    jQuery('#omnivaLtModal').show();
    getLocation();
    window.dispatchEvent(new Event('resize'));
    //console.log('1');
  }
  
   
    jQuery('#shipping_postcode, #billing_postcode').trigger('change');
 
  function getLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(loc) {
          if (postcode == ""){
        setCurrentLocation([loc.coords.latitude, loc.coords.longitude]);
          }
        });
      } 
    }
    
  function searchPostcode(postcode){
    if (postcode == "") return false;
    jQuery('#omniva-search form input').val(postcode);
    jQuery.getJSON( "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?singleLine="+postcode+","+omniva_current_country+"&category=&outFields=Postal&maxLocations=1&forStorage=false&f=pjson", function( data ) {
      if (data.candidates != undefined && data.candidates.length > 0){
        if (data.candidates[0].score > 90){
          setCurrentLocation([data.candidates[0].location.y,data.candidates[0].location.x]);
        } else {
          jQuery('.found_terminals').html(not_found);
        }
      }
    });
  }
  
  getTerminalsId = function(postcode){
    if (postcode == "") return false;
    if (omnivaCachedSearch[postcode] !== undefined) return omnivaCachedSearch[postcode];
    //jQuery('#omniva-search form input').val(postcode);

    jQuery.ajax({ dataType: "json", async:false, url:"http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?singleLine="+postcode+","+omniva_current_country+"&category=&outFields=Postal&maxLocations=1&forStorage=false&f=pjson", success : function( data ) {
      if (data.candidates != undefined && data.candidates.length > 0){
        if (data.candidates[0].score > 90){
          var terminals = findClosest([data.candidates[0].location.y,data.candidates[0].location.x],true);
          //console.log(terminals);
          var filteredTerminals = [];
          var counter = 0;
          jQuery.each( terminals, function( key, location ) {
            filteredTerminals.push([location[3],location['distance'],location[4]]);
            counter++;
            if (counter>=8) return false;
          });
          omnivaCachedSearch[postcode] = filteredTerminals;
          return filteredTerminals;
        } else {
          omnivaCachedSearch[postcode] = [];
        }
        return false;
        
    }}
    });
  }
  
  setCurrentLocation = function(pos){
    if (currentLocationIcon){
      map.removeLayer(currentLocationIcon);
    }
    //console.log('home');
    currentLocationIcon = L.marker(pos, {icon: homeIcon}).addTo(map);
    map.setView(pos,16);
    findClosest(pos);
  }
  
  function listTerminals(locations,limit=0,id=0){
     var html = '', counter=1;
    jQuery('.found_terminals').html('');
    jQuery.each( locations, function( key, location ) {
      if (limit != 0 && limit < counter){
        return false;
      }
      if (id !=0 && id != location[3]){
        return true;
      }
      if (autoSelectTerminal && counter == 1){
        terminalSelected(location[3],false);
      }
      var destination = [location[1], location[2]]
      var distance = 0;
      if (location['distance'] != undefined){
        distance = location['distance'];
      }
      html += '<li onclick="zoomTo(['+destination+'],'+location[3]+')" ><div><a class="omniva-li">'+counter+'. <b>'+location[0]+'</b></a> <b>'+distance+' km.</b>\
                                  <div align="left" id="omn-'+location[3]+'" class="omniva-details" style="display:none;"><small>\
                                  '+location[5]+' <br/>'+location[6]+'</small><br/>\
                                  <button type="button" class="btn-marker" style="font-size:14px; padding:0px 5px;margin-bottom:10px; margin-top:5px;height:25px;" onclick="terminalSelected('+location[3]+')">'+select_terminal+'</button>\
                                  </div>\
                                  </div></li>';
                                      
                      counter++;           
                       
    });
    document.querySelector('.found_terminals').innerHTML = '<ul class="omniva-terminals-list" start="1">'+html+'</ul>';
  }
  
  zoomTo = function(pos, id){
    terminalDetails(id);
    map.setView(pos,14);
  }
  
  terminalSelected = function(terminal,close=true) {
          var matches = document.querySelectorAll(".omnivaOption");
          for (var i = 0; i < matches.length; i++) {
            node = matches[i]
            if ( node.value.includes(terminal)) {
              node.selected = 'selected';
            } else {
              node.selected = false;
            }
          }
                
          jQuery('select[name="omnivalt_terminal"]').val(terminal);
          jQuery('select[name="omnivalt_terminal"]').trigger("change");
          if (close){
            jQuery('#omnivaLtModal').hide();
          }
        }
  
  function terminalDetails(id) {
                terminals = document.querySelectorAll(".omniva-details")
                for(i=0; i <terminals.length; i++) {
                    terminals[i].style.display = 'none';
                }
                id = 'omn-'+id;
                dispOmniva = document.getElementById(id)
                
                if(dispOmniva)
                    dispOmniva.style.display = 'block';
                  
  }
    function toRad(Value) 
        {
            return Value * Math.PI / 180;
        }
    
        function calcCrow(lat1, lon1, lat2, lon2) 
        {
          var R = 6371;
          var dLat = toRad(lat2-lat1);
          var dLon = toRad(lon2-lon1);
          var lat1 = toRad(lat1);
          var lat2 = toRad(lat2);
    
          var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          var d = R * c;
          return d;
        }
        
  function findClosest(pos,filter=false) {
                
      jQuery.each( locations, function( key, location ) {
        distance = calcCrow(pos[0], pos[1], location[1], location[2]);
        location['distance'] = distance.toFixed(2);
        
      });
    
                locations.sort(function(a, b) {
                    var distOne = a['distance']
                    var distTwo = b['distance']
                    if (parseFloat(distOne) < parseFloat(distTwo)) {
                        return -1;
                    }
                    if (parseFloat(distOne) > parseFloat(distTwo)) {
                        return 1;
                    }
                    return 0;
                })
    
        if (filter){
          return locations;
        } else {
        listTerminals(locations,8);
        }
  }
        
//});
  },    
  filterSelectTerminals : function(params, data) {
    if (jQuery.isNumeric(params.term) && params.term.length >= 4 && data.children !== undefined){        
      //var counter = jQuery(data.element).data('id');
      var terminals = getTerminalsId(params.term);
      if (terminals === undefined) return false;
      /*
      if (counter === undefined){
        return false;  
      }
      if (terminals !== undefined && terminals.length > counter){     
        var option = data.children[0];
        option.text = ""+terminals[counter][1]+" km" + " "+terminals[counter][2];
        option.id = terminals[counter][0];
        console.log(option);
        return option;
      } else {
          return null;
      }*/
      console.log(terminals);
      var match = jQuery.extend(true, {}, data);
      //var match = [];
      for (var c =  0; c < terminals.length; c++) {
        //var child = data.children[c];
        // If there wasn't a match, remove the object in the array
        for (var d = 0; d < data.children.length; d++) {
            if (data.children[d].id == terminals[c][0]){
                
                console.log(terminals[c]);
                console.log(data.children[d]);
            }
        }
        /*
        if(idx === undefined || idx.length == 0){
        //if (jQuery.inArray(child.id,terminals) === -1) {
          return null;
          //console.log(child);
          //console.log(terminals);
        } else {
            idx.text = ""+idx[1]+"km"+ " "+idx.text;
            //match.push()
            //match.children[c]
            //console.log(idx);
            return idx;
        }
        */
      }
      return false;
      // If any children matched, return the new object
      if (match.children.length > 0) {
          //console.log(match);
        return match;
      }
      
    }
    return select2defaultMatcher(params, data);
  
  }
}