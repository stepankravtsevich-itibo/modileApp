var app = {

  // Application Constructor
  initialize: function() {
    // config
    this.site = 'http://209.123.209.168:3000';  // ALPHA
//    this.site = 'http://209.123.209.154/';      // BETA
    this.watchID = null;
    this.coordinates = [];

    // как часто в милисекундах проверять геопозицию
    this.watchPositionTimeout = 300000;
    this.senderIDforPushMsg = "216199045656";
    this.current_page = "";
    this.check_interval_flag = false;
    this.autoconnect_flag = false;
    this.application_version = "0.2.3";
    this.application_build = "ALPHA";

    this.online_flag = function(){
      return !(navigator.network.connection.type == Connection.NONE);
    }

    this.cancell_inspection = function(data){
      if (typeof data != "undefined"){
        window.localStorage.setItem("cancellInspection", JSON.stringify(data));
        return;
      } else {
        return window.localStorage.getItem("cancellInspection") ? JSON.parse(window.localStorage.getItem("cancellInspection")) : false;
      }
    };

    this.getCheckStatus = function(){
      if (app.autoconnect_flag) {
        return 1;
      } else if (app.cancell_inspection()){
        return 2;
      } else if ("pending" == app.getJobInspectionContainer().status){
        return 3;
      } else {
        return 0;
      }
    };

    // сайты, доступные к инспекции
    this.sitesToInspect = function(){
      return window.localStorage.getItem("sitesToInspect") ? JSON.parse(window.localStorage.getItem("sitesToInspect")) : [];
    };

    this.setSitesToInspect = function(data, i){
      if (typeof i != "undefined"){
        var savetSitesToInspect = app.sitesToInspect();
        if ( "last" == i ){
          data = savetSitesToInspect.push(data);
        } else {
          savetSitesToInspect[i] = data;
          data = savetSitesToInspect;
        }
      }
      window.localStorage.setItem("sitesToInspect", JSON.stringify(data));
      return;
    };

    this.token = function(){
      return window.localStorage.getItem("token") ? window.localStorage.getItem("token") : false;
    };

    this.setToken = function(new_value){
      var self = this;
      if (new_value){
        window.localStorage.setItem("token", new_value);
      } else {
        window.localStorage.removeItem("token");
        self.setUserInfo(false);
      }
      return;
    };

    this.setJobInspectionContainer = function(data){
      var data = data || false;
      var job_container = {
        id: null,
        job_id: null,
        site_id: null,
        status: "",
        started_at: false,
        completed_at: false,
        container: []
      };

      if (data.id){
        window.localStorage.setItem("jobInspection", JSON.stringify($.extend(job_container, data)));
      } else {
        window.localStorage.setItem("jobInspection", JSON.stringify(job_container));
      }
      return;
    };

    this.getJobInspectionContainer = function(){
      var job_container = {
        id: null,
        job_id: null,
        site_id: null,
        status: "",
        started_at: false,
        completed_at: false,
        container: []
      };
      return window.localStorage.getItem("jobInspection") ? JSON.parse(window.localStorage.getItem("jobInspection")) : job_container;
    };


    this.setUserInfo = function(obj){
      if (obj){
        window.localStorage.setItem("userInfo", JSON.stringify(obj));
      } else {
        window.localStorage.removeItem("userInfo");
      }
    };

    this.getUserInfo = function(){
      return window.localStorage.getItem("userInfo") ? JSON.parse(window.localStorage.getItem("userInfo")) : {};
    };

    this.setPushID = function(push_id){
      if (push_id){
        window.localStorage.setItem("push_id", push_id);
      } else {
        window.localStorage.removeItem("push_id");
      }
      return;
    };

    this.getPushID = function(){
      return window.localStorage.getItem("push_id") ? window.localStorage.getItem("push_id") : false;
    };

    this.bindEvents();
  },

  // Bind Event Listeners
  //
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    var self = this;
    document.addEventListener('deviceready', $.proxy(this.onDeviceReady, self), false);
  },

  // deviceready Event Handler
  // The scope of 'this' is the event. In order to call the 'receivedEvent'
  // function, we must explicity call 'app.receivedEvent(...);'
  onDeviceReady: function() {
    var self = this;

    document.addEventListener('backbutton', $.proxy(this.backButton, self), false);
    document.addEventListener("online", $.proxy(this.onOnline, self), false);
    document.addEventListener("offline", $.proxy(this.onOffline, self), false);


    if (!self.getPushID()){
      self.pushRegister();
    }

    if(self.token()){
      self.autoconnect_flag = true;
      self.updatePosition();
      self.startCheckInterval();
    }

    self.route();

    $(document).bind( "pagebeforechange", function( e, data ) {
      if ( typeof data.toPage === "string" ) {
        self.route(data);
        e.preventDefault();
      }
    });
  },

  pushRegister: function(){
    var pushNotification;
    var successHandler = function (result) {};
    var errorHandler = function(error) {};
    try
    {
      pushNotification = window.plugins.pushNotification;

      if ((/android/ig).test(device.platform)) {
        pushNotification.register(successHandler, errorHandler,
          {
            "senderID": app.senderIDforPushMsg,
            "ecb":"app.onNotificationGCM"
          }
        );
      } else {
        pushNotification.register(
          function(result){
            app.setPushID(result);
          },
          errorHandler,
          {
            "badge":"true",
            "sound":"true",
            "alert":"true",
            "ecb":"app.onNotificationAPN"
          }
        );
      }
    }
    catch(err)
    {
      txt="There was an error on this page.\n\n";
      txt+="Error description: " + err.message + "\n\n";
      alert(txt);
    }
  },

  // handle APNS notifications for iOS
  onNotificationAPN: function (e) {
    if (e.alert) {
      navigator.notification.alert(e.alert);
    }
    if (e.sound) {
      /*        var snd = new Media(e.sound);
       snd.play();
       */
    }
    if (e.badge) {
      pushNotification.setApplicationIconBadgeNumber(function(result){}, e.badge);
    }
  },

  // handle GCM notifications for Android
  onNotificationGCM: function(e) {
    switch( e.event )
    {
      case 'registered':
        if ( e.regid.length > 0 )
        {
          app.setPushID(e.regid);
        }
        break;

      case 'message':
        if (e.foreground)
        {
          // if the notification contains a soundname, play it.
          /*                var my_media = new Media("/android_asset/www/"+e.soundname);
           my_media.play();
           */
        }
        else
        {	// otherwise we were launched because the user touched a notification in the notification tray.
          if (e.coldstart){
//            $("#app-status-ul").append('<li>--COLDSTART NOTIFICATION--' + '</li>');
          } else {
//            $("#app-status-ul").append('<li>--BACKGROUND NOTIFICATION--' + '</li>');
          }
        }
        alert(e.payload.message);
/*
        $("#app-status-ul").append('<li>MESSAGE -> MSG: ' + e.payload.message + '</li>');
        $("#app-status-ul").append('<li>MESSAGE -> MSGCNT: ' + e.payload.msgcnt + '</li>');*/
        break;

      case 'error':
//        $("#app-status-ul").append('<li>ERROR -> MSG:' + e.msg + '</li>');
        break;
      default:
//        $("#app-status-ul").append('<li>EVENT -> Unknown, an event was received and we do not know what it is</li>');
        break;
    }
  },

  stopCheckInterval: function(){
    clearInterval(app.check_interval_flag);
    app.check_interval_flag = false;
  },

  startCheckInterval: function(){
    if(app.token() && !app.check_interval_flag){
      app.check();
      app.check_interval_flag = setInterval(app.check, app.watchPositionTimeout);
    }
  },

  //TODO: refactor, refactor and refactor again
  check: function(use_geofence, callback){

/*    var use_geofence = use_geofence || false;
    var coordinates = app.coordinates;
    var status = (function(){
      if (app.cancell_inspection()){
        return 2;
      } else if (app.autoconnect_flag) {
        return 1;
      } else {
        return 0;
      }
    })();

    var ajax_call = function(position, success_callback, error_callback){
      $.ajax({
        type: "POST",
        url: app.site+'/mobile/check.json',
        cache: false,
        crossDomain: true,
        dataType: 'json',
        global: (typeof callback == "function")? true : false,
        timeout: 60000,
        data: {
          id: token,
          use_geofence: use_geofence,
          status: status,
          all_jobs: (typeof callback == "function")? true : false,
          gps: position
        },
        success: function(data){
          success_callback(data);
        },
        error: function(error){
          error_callback(error);
        }
      });
    };


    var token = app.token();
    if (token){
      if (app.getJobInspectionContainer().status == "submitting"){
        app.submitInspection(function(){
              app.setJobInspectionContainer(false);
            },
            function(error){
              // do nothing
            },
            coordinates
        );
      }

      if ( use_geofence ){
        $.when( app.get_position(), app.check_online() ).done(function(obj1, obj2){
          ajax_call(
              obj1.position,
              function(data) {
                app.autoconnect_flag = false;
                app.cancell_inspection(false);
                app.setSitesToInspect(data.jobs);
                (new WelcomeView()).updateContent();
                if(typeof callback == "function"){
                  callback();
                }
              },
              function(error){
                if (error.status == 401){
                  app.setToken(false);
                  app.route();
                } else{
                  app.route();
                }
              }
          );
        }).fail(function(obj){
              app.connecting_error(obj.error.message);
              if ($("#overlay").is(':visible')){
                $("#overlay").hide();
              }
            });
      } else {
        if (coordinates.length > 0){
          $.when(app.check_online()).done(function(_obj){
            ajax_call(
                coordinates,
                function(data) {
                  app.autoconnect_flag = false;
                  app.cancell_inspection(false);
                  app.coordinates = (app.coordinates).slice(coordinates.length);
                  var savedSitesToInspect = app.sitesToInspect();
                  $.each(data.jobs, function(ind,v){
                    var new_site = true;
                    for(var i=0; i < savedSitesToInspect.length; i++) {
                      if(v.id == savedSitesToInspect[i].id){
                        new_site = false;
                        if (v.last_inspection != savedSitesToInspect[i].last_inspection){
                          app.setSitesToInspect(v, i);
                        }
                        break;
                      }
                    }
                    if (new_site){
                      app.setSitesToInspect(v, "last");
                    }
                  });
                  (new WelcomeView()).updateContent();

                  if(typeof callback == "function"){
                    callback();
                  }
                  if ($("#overlay").is(':visible')){
                    $("#overlay").hide();
                  }
                },
                function(error){
                  if (error.status == 401){
                    app.setToken(false);
                    app.route();
                  }
                  if ($("#overlay").is(':visible')){
                    $("#overlay").hide();
                  }
                }
            );
          }).fail(function(_obj){
            if ($("#overlay").is(':visible')){
              $("#overlay").hide();
            }
          });
        } else {
          $.when( app.get_position(), app.check_online() ).done(function(_obj1, _obj2){
            ajax_call(
                _obj1.position,
                function(data) {
                  app.autoconnect_flag = false;
                  app.cancell_inspection(false);
                  app.coordinates = (app.coordinates).slice(coordinates.length);
                  var savedSitesToInspect = app.sitesToInspect();
                  $.each(data.jobs, function(ind,v){
                    var new_site = true;
                    for(var i=0; i < savedSitesToInspect.length; i++) {
                      if(v.id == savedSitesToInspect[i].id){
                        new_site = false;
                        if (v.last_inspection != savedSitesToInspect[i].last_inspection){
                          app.setSitesToInspect(v, i);
                        }
                        break;
                      }
                    }
                    if (new_site){
                      app.setSitesToInspect(v, "last");
                    }
                  });
                  (new WelcomeView()).updateContent();

                  if(typeof callback == "function"){
                    callback();
                  }
                  if ($("#overlay").is(':visible')){
                    $("#overlay").hide();
                  }
                },
                function(error){
                  if (error.status == 401){
                    app.setToken(false);
                    app.route();
                  }
                  if ($("#overlay").is(':visible')){
                    $("#overlay").hide();
                  }
                }
            );
          }).fail(function(_obj){
            app.connecting_error(_obj.error.message);
            if ($("#overlay").is(':visible')){
              $("#overlay").hide();
            }
          });
        }
      }
    } else {
      app.route();
    }*/

    var token = app.token();
    if (token){
      if (app.online_flag()){
        var use_geofence = use_geofence || false;
        var coordinates = app.coordinates;

        if ( use_geofence ){
          $.when( app.get_position(), app.check_online() ).done(function(obj1, obj2 ){
            if (app.getJobInspectionContainer().status == "submitting"){
              app.submitInspection(function(){
                    app.setJobInspectionContainer(false);
                  },
                  function(error){
                    // do nothing
                  },
                  obj1.position
              );
            }
            $.ajax({
              type: "POST",
              url: app.site+'/mobile/check.json',
              data: {
                id: token,
                use_geofence: use_geofence,
                version: app.application_version,
                all_jobs: (typeof callback == "function")? true : false,
                gps: obj1.position
              },
              cache: false,
              crossDomain: true,
              dataType: 'json',
              global: (typeof callback == "function")? true : false,
              timeout: 60000,
              success: function(data) {
                app.autoconnect_flag = false;
                app.cancell_inspection(false);
                app.setSitesToInspect(data.jobs);
                (new WelcomeView()).updateContent();

                if(typeof callback == "function"){
                  callback();
                }
              },
              error: function(error){
                if (error.status == 401){
                  app.setToken(false);
                  app.route();
                } else{
                  app.route();
                }
              }
            });
          }).fail(function(obj){
            app.connecting_error(obj.error.message);
            if ($("#overlay").is(':visible')){
              $("#overlay").hide();
            }
          });
        } else if (coordinates.length > 0 ) {
          if (app.getJobInspectionContainer().status == "submitting"){
            app.submitInspection(function(){
                  app.coordinates = (function(used_coords){
                    var not_used_coords = [];
                    $.each(app.coordinates, function(i,v){
                      if ($.inArray( v, used_coords ) < 0 ){
                        not_used_coords.push(v);
                      }
                    });
                    return not_used_coords;
                  })(coordinates);
                  app.setJobInspectionContainer(false);
                },
                function(error){
                  // do nothing
                },
                coordinates
            );
          }

          $.ajax({
            type: "POST",
            url: app.site+'/mobile/check.json',
            data: {
              id: token,
              use_geofence: use_geofence,
              version: app.application_version,
              all_jobs: (typeof callback == "function")? true : false,
              gps: coordinates
            },
            cache: false,
            crossDomain: true,
            dataType: 'json',
            global: (typeof callback == "function")? true : false,
            success: function(data) {
              app.autoconnect_flag = false;
              app.cancell_inspection(false);
              app.coordinates = (app.coordinates).slice(coordinates.length);
              var savedSitesToInspect = app.sitesToInspect();
              $.each(data.jobs, function(ind,v){
                var new_site = t
                rue;
                for(var i=0; i < savedSitesToInspect.length; i++) {
                  if(v.id == savedSitesToInspect[i].id){
                    new_site = false;
                    if (v.last_inspection != savedSitesToInspect[i].last_inspection){
                      app.setSitesToInspect(v, i);
                    }
                    break;
                  }
                }
                if (new_site){
                  app.setSitesToInspect(v, "last");
                }
              });
              (new WelcomeView()).updateContent();

              if(typeof callback == "function"){
                callback();
              }
            },
            error: function(error){
              if (error.status == 401){
                app.setToken(false);
                app.route();
              } else{
                // do nothing
              }
            }
          });
        } else if ( 0 == coordinates.length && 1 == app.getCheckStatus() ) {
          navigator.geolocation.getCurrentPosition(
              function(position){
                $.ajax({
                  type: "POST",
                  url: app.site+'/mobile/check.json',
                  data: {
                    id: token,
                    use_geofence: use_geofence,
                    version: app.application_version,
                    all_jobs: (typeof callback == "function")? true : false,
                    gps: [{
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      time: (new Date()).toUTCString(),
                      application_status: 1
                    }]
                  },
                  cache: false,
                  crossDomain: true,
                  dataType: 'json',
                  global: (typeof callback == "function")? true : false,
                  success: function(data) {
                    app.autoconnect_flag = false;
                    app.cancell_inspection(false);
                    var savedSitesToInspect = app.sitesToInspect();
                    $.each(data.jobs, function(ind,v){
                      var new_site = true;
                      for(var i=0; i < savedSitesToInspect.length; i++) {
                        if(v.id == savedSitesToInspect[i].id){
                          new_site = false;
                          if (v.last_inspection != savedSitesToInspect[i].last_inspection){
                            app.setSitesToInspect(v, i);
                          }
                          break;
                        }
                      }
                      if (new_site){
                        app.setSitesToInspect(v, "last");
                      }
                    });
                    (new WelcomeView()).updateContent();

                    if(typeof callback == "function"){
                      callback();
                    }
                  },
                  error: function(error){
                    if (error.status == 401){
                      app.setToken(false);
                      app.route();
                    } else{
                      // do nothing
                    }
                  }
                });
              },
              function(error){
                // do nothing
              },
              {timeout:30000, maximumAge: 0}
          );
        }
      } else if (typeof callback == "function" && !app.online_flag()) {
        app.connecting_error();
      }
    } else {
      app.route();
    }
  },

  updatePosition: function(){
    var geolocation = navigator.geolocation;

    if (geolocation){
      app.watchID = geolocation.watchPosition(
        function(position){
          if (app.watchID != null) {
            if (app.token()){
              var job_inspect_container = app.getJobInspectionContainer();
              if (typeof app.coordinates[app.coordinates.length - 1] != "undefined"){
                var prev_loc = app.coordinates[app.coordinates.length - 1];
                var R = 6371; // km
                var dLat = (position.coords.latitude - prev_loc.lat).toRad();
                var dLon = (position.coords.longitude - prev_loc.lng).toRad();
                var lat1 = prev_loc.lat.toRad();
                var lat2 = position.coords.latitude.toRad();
                var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                var d = R * c;
                if (d > 0.05){
                  app.coordinates.push({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    time: (new Date()).toUTCString(),
                    application_status: app.getCheckStatus(),
                    site_id: (job_inspect_container.site_id)? (job_inspect_container.site_id) : null,
                    job_id: (job_inspect_container.job_id)? (job_inspect_container.job_id) : null
                  });
                }
              } else {
                app.coordinates.push({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  time: (new Date()).toUTCString(),
                  application_status: app.getCheckStatus(),
                  site_id: (job_inspect_container.site_id)? (job_inspect_container.site_id) : null,
                  job_id: (job_inspect_container.job_id)? (job_inspect_container.job_id) : null
                });
              }
            } else {
              app.coordinates = [{
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                time: (new Date()).toUTCString(),
                application_status: app.getCheckStatus()
              }];
            }
          }
        },
        function(PositionError){
          console.log(PositionError.message);
        },
        {
          enableHighAccuracy: true,
          timeout: app.watchPositionTimeout
        }
      );
    }
  },

  get_position: function(defined_position){
    return $.Deferred(function($deferred){
      var job_inspect_container = app.getJobInspectionContainer();

      if ($("#overlay").is(':hidden')){
        $("#overlay").show();
      }

      if (typeof defined_position != "undefined" && !!defined_position){
        if ($.isArray(defined_position)){
          $deferred.resolve({
            status: 'success',
            position: defined_position
          });
        } else if (typeof defined_position != "object") {
          $deferred.resolve({
            status: 'success',
            position: [{
              lat: defined_position.coords.latitude,
              lng: defined_position.coords.longitude,
              time: (new Date()).toUTCString(),
              application_status: app.getCheckStatus(),
              site_id: (job_inspect_container.site_id)? (job_inspect_container.site_id) : null,
              job_id: (job_inspect_container.job_id)? (job_inspect_container.job_id) : null
            }]
          });
        } else {
          $deferred.reject({
            status: 'error',
            error: {
              message: "Wrong position format"
            }
          });
        }
      } else {
        if (navigator.geolocation){
          navigator.geolocation.getCurrentPosition(
              function(position){
                $deferred.resolve({
                  status: 'success',
                  position: [{
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    time: (new Date()).toUTCString(),
                    application_status: app.getCheckStatus(),
                    site_id: (job_inspect_container.site_id)? (job_inspect_container.site_id) : null,
                    job_id: (job_inspect_container.job_id)? (job_inspect_container.job_id) : null
                  }]
                });
              },
              function(error){
                $deferred.reject({
                  status: 'error',
                  error: error
                });
              },
              { maximumAge: 0, timeout: 60000 }
          );
        } else {
          $deferred.reject({
            status: 'error',
            error: {
              message: "Your browser doesn't support geolocation!"
            }
          });
        }
      }
    }).promise();
  },

  check_online: function(){
    return $.Deferred(function($deferred){
      if ($("#overlay").is(':hidden')){
        $("#overlay").show();
      }
      if (app.online_flag()){
        $deferred.resolve({
          status: 'success'
        });
      } else {
        $deferred.reject({
          status: 'error',
          error: {
            code: 4,
            message: "There is Internet connection problem. Please try again later"
          }
        });
      }
    }).promise();
  },

  getInspectionsLog: function(success_callback){
    var self = this;
    var ajax_call = function(){
      var token = app.token();
      $.ajax({
        type: "POST",
        url: app.site+'/mobile/inspections_log.json',
        data: {
          id: token
        },
        cache: false,
        crossDomain: true,
        dataType: 'json',
        timeout: 60000,
        success: function(data) {
          if (data.token == token){
            if (typeof success_callback == "function"){
              success_callback(data.log);
            }
          } else {
            app.setToken(false);
            app.route();
          }
          return false;
        },
        error: function(error){
          app.errorAlert(error, "Error", function(){
            if (error.status == 401){
              app.setToken(false);
              app.route();
            } else {
              app.errorAlert(error, "Error", function(){
                app.route();
              });
            }
          });
        }
      });
    };

    $.when( app.check_online() ).done(function(obj){
      ajax_call.call(self);
    }).fail(function(obj){
      app.connecting_error(obj.error.message);
      if ($("#overlay").is(':visible')){
        $("#overlay").hide();
      }
    });
  },

  getSitesList: function(success_callback){
    var self = this;
    var ajax_call = function(pos){
      var token = app.token();
      $.ajax({
        type: "POST",
        url: app.site+'/mobile/jobs.json',
        data: {
          id: token,
          gps: pos
        },
        cache: false,
        crossDomain: true,
        dataType: 'json',
        timeout: 60000,
        success: function(data) {
          if (data.token == token){
            if (typeof success_callback == "function"){
              success_callback(data.jobs);
            }
          } else {
            app.setToken(false);
            app.route();
          }
          return false;
        },
        error: function(error){
          app.errorAlert(error, "Error", function(){
            if (error.status == 401){
              app.setToken(false);
              app.route();
            } else {
              app.errorAlert(error, "Error", function(){
                app.route();
              });
            }
          });
        }
      });
    };

    $.when( app.get_position(), app.check_online() ).done(function(obj1, obj2 ){
      ajax_call.call(self, obj1.position);
    }).fail(function(obj){
      app.connecting_error(obj.error.message);
      if ($("#overlay").is(':visible')){
        $("#overlay").hide();
      }
    });
  },

  showContent: function(args_array){
    var urlObj, options,
      self = this,
      $container = $('body>div#main');

    urlObj = args_array[0];
    options = (args_array.length > 1) ? args_array[1] : {};

    switch (true) {
      case '#login' == urlObj.hash:
        $container.html(new LoginView().render().el).trigger('pagecreate');
        break;
      case '#my_jobs' == urlObj.hash:
        app.check(true, function(){
          $container.html(new MyJobsView().render().el).trigger('pagecreate');
        });

        break;
      case '#siteslist' == urlObj.hash:
        app.getSitesList(function(list){
          $container.html(new SitesListView(list).render().el).trigger('pagecreate');
        });
        break;
      case /^#inspection:(\d+)$/.test(urlObj.hash):
        var id = parseInt(urlObj.hash.match(/\d+$/g));
        app.getCheckList(id, function(list, checklist_id){
          app.setJobInspectionContainer($.extend(app.getJobInspectionContainer(), {checklist_id: checklist_id} ));
          $container.html(new InspectionView(list).render().el).trigger('pagecreate');
        });
        break;
      case '#inspectionslog' == urlObj.hash:
        app.getInspectionsLog(function(list){
          $container.html(new InspectionsLogView(list).render().el).trigger('pagecreate');
        });
        break;
      case '#welcome' == urlObj.hash:
      default:
        $container.html(new WelcomeView().render().el).trigger('pagecreate');
        break;
    }
    $container.page();

    options.dataUrl = urlObj.href;
    $.mobile.changePage( $container, options );
    return $container;
  },

  // routing
  route: function(data){
    var u,
        arguments = [],
        self = this;
    data = data || {};
    u = $.mobile.path.parseUrl( ((typeof data == 'object') && (typeof data.toPage == 'string'))?
        data.toPage : window.location.href );

    if (app.token()){
      if (u.hash == "#login"){
        u = $.mobile.path.parseUrl(u.hrefNoHash);
      }
      var job_insp_cont = app.getJobInspectionContainer();
      if (job_insp_cont.id && job_insp_cont.status == "pending" ){
        u = $.mobile.path.parseUrl(u.hrefNoHash + "#inspection:" + job_insp_cont.id);
      }
    } else {
      u = $.mobile.path.parseUrl(u.hrefNoHash + "#login");
    }
    app.current_page = u.hash;
    arguments.push(u);
    if (typeof data.options === "object"){
      arguments.push(data.options);
    }
    self.showContent(arguments);
  },

  //get inspection check list of the current job
  getCheckList: function(id_in_job_avail_to_inspect, success_callback){
    id_in_job_avail_to_inspect = id_in_job_avail_to_inspect || false;
    var self = this;
    var ajax_call = function(pos){
      var token = app.token(),
        job_info = (function(id){
          var tmp = {};
          if ("pending" == app.getJobInspectionContainer().status){
            tmp.job_id = app.getJobInspectionContainer().job_id;
            tmp.site_id = app.getJobInspectionContainer().site_id;
          } else {
            $.each(app.sitesToInspect(), function(i,v){
              if(v.id == id){
                tmp = {
                  job_id: v.job_id,
                  site_id: v.site_id
                }
                return false;
              }
            });
          }
          return tmp;
        })(id_in_job_avail_to_inspect);
      $.ajax({
        type: "POST",
        url: app.site+'/mobile/show_checklist.json',
        data: {
          id: token,
          job_id: job_info.job_id,
          site_id: job_info.site_id,
          gps: pos
        },
        cache: false,
        crossDomain: true,
        dataType: 'json',
        timeout: 60000,
        success: function(data) {
          if (data.token == token){
            app.setJobInspectionContainer($.extend(app.getJobInspectionContainer(), {status: "pending"}, job_info));
            if (typeof success_callback == "function"){
              success_callback(data.list, data.checklist_id);
            }
          } else {
            app.setToken(false);
            app.route();
          }
          return false;
        },
        error: function(error){
          app.errorAlert(error, "Error", function(){
            if (error.status == 401){
              app.setToken(false);
              app.route();
            } else {
              app.route({toPage: window.location.href + "#my_jobs"});
            }
          });
        }
      });
    };
    $.when( app.check_online(), app.get_position() ).done(function(obj1, obj2 ){
      var inspect_job_cont = app.getJobInspectionContainer();
      if (inspect_job_cont.id && inspect_job_cont.status == "submitting" ){
        navigator.notification.alert(
          "There is an unsubmitted inspection. Please, wait until submission will finish and try again.",
          function(){
            app.route({
              toPage: window.location.href + "#my_jobs"
            });
          },
          "Error inspection starting",
          'Ok'
        );
      } else {
        if (inspect_job_cont.id != id_in_job_avail_to_inspect){
          app.setJobInspectionContainer($.extend( app.getJobInspectionContainer(), {id: id_in_job_avail_to_inspect, started_at: (new Date()).toUTCString()}));
        }
        ajax_call.call(self, obj2.position);
      }
    }).fail(function(err_obj){
      if (typeof err_obj.error.code != "undefined" && ($.inArray(err_obj.error.code, [2,4]) > -1 )){
        navigator.notification.confirm(
            "There is Internet connection problem. Please try again later",
            function(buttonIndex){
              if (1 == buttonIndex){
                navigator.geolocation.clearWatch(app.watchID);
                app.watchID = null;
                app.stopCheckInterval();
                navigator.app.exitApp();
              } else if (2 == buttonIndex){
                app.route({
                  toPage: window.location.href + app.current_page
                });
              }
            },
            (4 == err_obj.error.code) ? "Unable to restore your session" : "Unable to determine your location",
            "Close, Refresh"
        );
      } else {
        app.connecting_error(err_obj.error.message);
      }
      if ($("#overlay").is(':visible')){
        $("#overlay").hide();
      }
    });
  },

  // submit inspection to server
  submitInspection: function(success_clb, error_clb, position){
    var submit_data = app.getJobInspectionContainer();
    var success_ajax_call = function(){
      navigator.notification.alert( "Inspection submitted",
        function(){
          app.setJobInspectionContainer(false);
          app.route({
            toPage: window.location.href + "#welcome"
          });
        },
        "Success", 'Ok');
    };

    var error_ajax_call = function(error){
      app.errorAlert(error, "Error", function(){
        var inspect_container = app.getJobInspectionContainer();
        app.setJobInspectionContainer($.extend(inspect_container, {
          status: "submitting",
          completed_at: (inspect_container.completed_at)? inspect_container.completed_at: (new Date()).toUTCString()
        }));
        if (error.status == 401){
          app.setToken(false);
          app.route();
        } else {
          app.errorAlert(error, "Error", function(){
            app.route();
          });
        }
      });
    };

    var success_getting_position = function(pos){

      var token = app.token();
      var job_fields = (function(){
        var inspect_job_cont = app.getJobInspectionContainer();
        return {job_id: inspect_job_cont.job_id, site_id: inspect_job_cont.site_id};
      })();

      var get_position_arr = function(pos){
        var arr = [];
        if ($.isArray(pos)){
          arr = pos;
        } else {
          arr = [$.extend({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            time: (new Date()).toUTCString()
          }, job_fields)];
        }
        return arr;
      };
      var ajax_call = function(){
        $.ajax({
          type: "POST",
          url: app.site+'/mobile/update_checklist.json',
          data: {
            id: token,
            job_id: job_fields.job_id,
            site_id: job_fields.site_id,
            started_at: submit_data.started_at,
            completed_at: submit_data.completed_at ? submit_data.completed_at : (new Date()).toUTCString(),
            gps: get_position_arr(pos),
            checklist_id: submit_data.checklist_id ? submit_data.checklist_id : "",
            checklist_results: submit_data.container ? submit_data.container : [],
            comment: submit_data.comment

          },
          cache: false,
          crossDomain: true,
          dataType: 'json',
          timeout: 60000,
          success: function() {
            if (success_clb && typeof success_clb == "function"){
              success_clb();
            } else {
              success_ajax_call();
            }
          },
          error: function(error){
            if (error_clb && typeof error_clb == "function"){
              error_clb(error);
            } else {
              error_ajax_call(error);
            }
          }
        });
      }

      if(app.online_flag()){
        ajax_call();
      } else {
        navigator.notification.alert(
          "There was an inspection submitting error. The inspection will be submitted as soon as the internet connection and gps signal resumes.",
          function(){
            var inspect_container = app.getJobInspectionContainer();
            app.setJobInspectionContainer($.extend(inspect_container, {
              status: "submitting",
              completed_at: (inspect_container.completed_at)? inspect_container.completed_at : (new Date()).toUTCString()
            }));
            app.route({
              toPage: window.location.href
            });
          },
          "Error inspection submitting",
          'Ok'
        );
      }
    };

    var error_getting_position = function(error){
      navigator.notification.alert(
          "There was an inspection submitting error. The inspection will be submitted as soon as the internet connection and gps signal resumes.",
          function(){
            var inspect_container = app.getJobInspectionContainer();
            app.setJobInspectionContainer($.extend(inspect_container, {
              status: "submitting",
              completed_at: (inspect_container.completed_at) ? inspect_container.completed_at : (new Date()).toUTCString()
            }));
            app.route({
              toPage: window.location.href
            });
          },
          "Error inspection submitting",
          'Ok'
      );
    };

    if (typeof position != "undefined"){
      success_getting_position(position);
    } else {
      navigator.geolocation.getCurrentPosition(success_getting_position, error_getting_position, {timeout:30000, maximumAge: 0});
    }
  },

  //login
  getLoginToken: function(email, password){
    var success_getting_position = function(pos){
      $.ajax({
        type: "POST",
        url: app.site+'/mobile/login.json',
        data: {
          email: email,
          password: password,
          gps: pos,
          device: {
            uuid: device.uuid,
            platform: device.platform
          },
          push_id: app.getPushID(),
          version: app.application_version
        },
        cache: false,
        crossDomain: true,
        dataType: 'json',
        success: function(data) {
          app.setToken(data.token);
          app.setUserInfo(data.user);
          app.cancell_inspection(false);
          app.setJobInspectionContainer(false);
          app.updatePosition();
          app.startCheckInterval();
          app.route();
          return false;
        },
        error: function(error){
          app.errorAlert(error, 426 == error.status ? "Application Must Be Updated" :"Error", function(){} );
        }
      });
    };

    $.when( app.check_online(), app.get_position() ).done(function(obj1, obj2 ){
      success_getting_position(obj2.position);
    }).fail(function(err_obj){
      var msg = (function(){
        var message = "";
        if (2 == err_obj.error.code){
          message = "Unable to determine your location. To continue you need to have at least 'Use wireless networks' option enabled in GPS settings.";
        } else if (4 == err_obj.error.code){
          message = "Sorry, login failed to reach the Inspection server. Please check your network connection or try again later.";
        } else {
          message = err_obj.error.message;
        }
        return message;
      })();
      navigator.notification.alert(
          msg, //message
          function(){},    // callback
          (4 == err_obj.error.code) ? "Login Failed" : "Unable to determine your location", // title
          'Ok'         // buttonName
      );
      $("#overlay").hide();
    });
  },

  //logout
  logout: function(){
    var logout_process = function(){
      navigator.geolocation.clearWatch(app.watchID);
      app.watchID = null;
      app.stopCheckInterval();
      app.setToken(false);
      app.coordinates = [];
      app.setSitesToInspect([]);
      app.setJobInspectionContainer(false);
      app.autoconnect_flag = false;
      app.cancell_inspection(false);

      app.route();
    };
    var success_getting_position = function(pos){
      var ajax_call = function(){
        $.ajax({
          type: "POST",
          url: app.site+'/mobile/logout.json',
          data: {
            id: app.token(),
            gps: [{
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              time: (new Date()).toUTCString()
            }]
          },
          cache: false,
          crossDomain: true,
          dataType: 'json',
          timeout: 60000,
          success: function(data) {
            logout_process();
          },
          error: function(error) {
          }
        });
      }
      if (app.online_flag()){
        ajax_call();
      } else {
        app.connecting_error();
      }
    };
    var error_getting_position = function(err){
      app.errorAlert(error, "Error getting position", function(){} );
    };

    navigator.geolocation.getCurrentPosition(success_getting_position, error_getting_position, {timeout:30000, maximumAge: 0});
  },

  backButton: function(){
    if ($(".pop_up").css('visibility') == 'visible'){
      $(".pop_up").css("visibility", "hidden");
      $(".popup-overlay").remove();
    }else{
      switch (true) {
        case /^#inspection:(\d+)$/.test(app.current_page):
          navigator.notification.confirm("Do you want to cancel this inspection?",
              function(buttonIndex){
                if(2 == buttonIndex){
                  app.cancell_inspection(true);
                  app.setJobInspectionContainer(false);
                  app.route({
                    toPage: window.location.href + "#my_jobs"
                  });
                }
              },
              "Inspection cancelling",
              'No,Yes'
          );
          break;
        case '#welcome' == app.current_page:
        case '' == app.current_page:
        case '#' == app.current_page:
        case '#login' == app.current_page:
          app.showConfirm('Close', 'Do you want to quit? ',
              function(buttonIndex){
                if(2 == buttonIndex){
                  navigator.geolocation.clearWatch(app.watchID);
                  app.watchID = null;
                  app.stopCheckInterval();
                  navigator.app.exitApp();
                }
              }
          );
          break;

        default:
          app.route();
          break;
      }
    }
  },

  showConfirm: function(title, question, on_submit_event) {
    navigator.notification.confirm(
        question,
        on_submit_event,
        title,
        'Cancel,OK'
    );
  },

  errorAlert: function(error, title, callback){
    var msg = {};
    if (error.status == 0){
      msg.message = "Service unavailable. Please try later.";
    } else {
      msg = $.parseJSON(error.responseText);
    }
    navigator.notification.alert(
        msg.message, // message
        callback,    // callback
        title,       // title
        'Ok'         // buttonName
    );
  },

  onOnline: function(){
    app.startCheckInterval();
  },

  onOffline: function(){
    app.stopCheckInterval();
  },

  connecting_error: function(msg, buttons, title){
    msg = msg || "There is Internet connection problem. Please try again later";
    buttons = buttons || "Refresh, Back to Main Page";
    title = title || "Internet connection problem";
    navigator.notification.confirm(
        msg,
        function(buttonIndex){
          if (1 == buttonIndex){
            app.route({
              toPage: window.location.href + app.current_page
            });
          } else if (2 == buttonIndex){
            app.route();
          }
        },
        title,
        buttons
    );
  }

};

// for those ajax where global: true
$(document).ajaxStart(function() {
  if ($("#overlay").is(':hidden')){
    $("#overlay").show();
  }
}).ajaxComplete(function() {
  $("#overlay").hide();
});


/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}