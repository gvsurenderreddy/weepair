window.weepair = {};

stik.boundary({
  as: "gui",
  from: "controller|behavior",
  to: require('nw.gui')
});

stik.boundary({
  as: "tray",
  from: "controller",
  call: true,
  to: function(gui){
    if (!window.weepair.tray) {
      window.weepair.tray = new gui.Tray({ icon: 'img/icon.png' });
    }
    return window.weepair.tray;
  }
});

stik.boundary({
  as: "appWindow",
  from: "controller|behavior",
  call: true,
  to: function(gui){
    return gui.Window.get();
  }
});

stik.boundary({
  as: "toggleClass",
  from: "controller|behavior",
  call: true,
  to: function(hasClass){
    return function(elm, className, force){
      if (!force && hasClass(elm, className)) {
        var regex = new RegExp("\\b\\s?" + className + "\\b", "g");
        elm.className = elm.className.replace(regex, '');
      } else if (!hasClass(elm, className)) {
        elm.className += " " + className;
      }
    }
  }
});

stik.boundary({
  as: "hasClass",
  from: "controller|behavior",
  to: function(elm, selector){
    var className = " " + selector + " ";
    return (" " + elm.className + " ").replace(/[\n\t]/g, " ").indexOf(className) > -1;
  }
});

stik.controller("AppCtrl", function(ctrl){
  ctrl.action("Bootstrap", function(appWindow, $courier, $template, toggleClass){
    Mousetrap.bind('command+d', function(){
      appWindow.showDevTools('', false);
    });

    Mousetrap.bind('command+f', function(){
      appWindow.toggleFullscreen();
    });

    Mousetrap.bind('command+k', function(){
      appWindow.toggleKioskMode();
    });

    Mousetrap.bind('command+s', function(){
      appWindow.capturePage(function(img) {
        var base64Data = img.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
        require("fs").writeFile("session.png", base64Data, 'base64', function(err) {
          console.log(err);
        });
      }, 'png');

      appWindow.capturepagedone(function(){
        // display screenshot alert
      });
    });

    $courier.$receive("successfulSignIn", function(){
      toggleClass($template, 'signed-in', false);
    });
  });

  ctrl.action("ContextMenu", function($template, gui, tray){
    var menu = new gui.Menu();
    menu.append(new gui.MenuItem({ label: 'Pause' }));
    menu.append(new gui.MenuItem({ label: 'Resume', enabled: false }));
    menu.append(new gui.MenuItem({ type: 'separator' }));
    menu.append(new gui.MenuItem({ label: 'Mute' }));
    menu.append(new gui.MenuItem({ label: 'Unmute', enabled: false }));
    menu.append(new gui.MenuItem({ type: 'separator' }));
    tray.menu = menu;

    $template.addEventListener('contextmenu', function(ev){
      ev.preventDefault();
      menu.popup(ev.x, ev.y);
      return false;
    });
  });
});

stik.controller("SignCtrl", function(ctrl){
  ctrl.action("SignIn", function($template, $courier){
    var form = $template.children[0];

    // validator(form, [{
    //   name: "name",
    //   rules: "minLength[4]"
    // }]);

    form.querySelector("input[type=submit]").addEventListener("click", function(event){
      event.preventDefault();
      $courier.$send("successfulSignIn");
    });
  });
});

stik.controller("SessionCtrl", function(ctrl){
  ctrl.action("Videos", function($template, $courier){
    $courier.$receive("successfulSignIn", function(){
      var webrtc = new SimpleWebRTC({
        localVideoEl: 'localVideo',
        remoteVideosEl: 'remoteVideo',
        autoRequestMedia: true
      });

      webrtc.on('readyToCall', function (){
        $courier.$send("onCall");
        webrtc.joinRoom('weepair');
      });
    });
  });
});

stik.behavior("app-callable", function($template, $courier, appWindow, toggleClass){
  $courier.$receive("onCall", function(){
    toggleClass($template, 'on-call', true);
    appWindow.requestAttention(true);
    appWindow.setAlwaysOnTop(true);
  });
});

stik.behavior("app-focusable", function(appWindow, $template, toggleClass, hasClass){
  toggleClass($template, "app-focused", true);

  appWindow.on("focus", function(){
    toggleClass($template, "app-focused", true);
  });

  appWindow.on("blur", function(event){
    toggleClass($template, "app-focused", false);
  });
});
