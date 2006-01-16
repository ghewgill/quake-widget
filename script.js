var quakes = [];
var minLoadedMagnitude;

function ago(d)
{
    var diff = new Date().getTime() - Date.parse(d);
    var n, unit;
    if (diff < 3600000) {
        n = Math.floor(diff / 60000);
        unit = "minute";
    } else if (diff < 86400000) {
        n = Math.floor(diff / 3600000);
        unit = "hour";
    } else {
        n = Math.floor(diff / 86400000);
        unit = "day";
    }
    var r = n + " " + unit;
    if (n != 1) {
        r += "s";
    }
    return r + " ago";
}

function toint(s)
{
    var r = parseInt(s);
    if (isNaN(r)) {
        r = 0;
    }
    return r;
}

function resetMap(doRefresh)
{
    var zoom = toint(preferences.zoom.value);
    if (zoom == 1) {
        if (preferences.mapType.value == "ringoffire") {
            Map.src = "Resources/world.jpg";
            Map.width = Map.srcWidth;
            Map.height = Map.srcHeight;
            Map.hOffset = -150;
            Map.vOffset = 0;
            Map.visible = true;
        } else {
            Map.src = "Resources/world.jpg";
            Map.width = Map.srcWidth;
            Map.height = Map.srcHeight;
            Map.hOffset = 0;
            Map.vOffset = 0;
            Map.visible = true;
        }
    } else {
        Map.src = "Resources/bigworld.jpg";
        Map.width = 256 * zoom;
        Map.height = 128 * zoom;
        Map.hOffset = -toint(preferences.zoomX.value)/8*zoom + MapWindow.width/2;
        Map.vOffset = -toint(preferences.zoomY.value)/8*zoom + MapWindow.height/2;
        Map.visible = true;
    }
    if (Map.hOffset > 0) {
        Map2.src = Map.src;
        Map2.width = Map.width;
        Map2.height = Map.height;
        Map2.hOffset = Map.hOffset - Map.width;
        Map2.vOffset = Map.vOffset;
        Map2.visible = true;
    } else if (Map.hOffset + Map.width < MapWindow.width) {
        Map2.src = Map.src;
        Map2.width = Map.width;
        Map2.height = Map.height;
        Map2.hOffset = Map.hOffset + Map.width;
        Map2.vOffset = Map.vOffset;
        Map2.visible = true;
    } else {
        Map2.visible = false;
    }
    Map.contextMenuItems[0].enabled = zoom > 1;
    Map.contextMenuItems[1].enabled = zoom < 16;
    Map.contextMenuItems[2].enabled = zoom > 1;
    Map.contextMenuItems[3].enabled = zoom > 1;
    if (doRefresh) {
        refresh();
    }
}

function clearDisplay()
{
    for (var i = 0; i < quakes.length; ++i) {
        if (quakes[i].circle) {
            quakes[i].circle.removeFromSuperview();
        }
        if (quakes[i].label) {
            quakes[i].label.removeFromSuperview();
        }
    }
}

function clear()
{
    clearDisplay();
    quakes = [];
}

function reload()
{
    print("reloading from earthquake.usgs.gov");
    RetryTimer.ticking = false;
    Error.visible = false;
    Loading.visible = true;
    updateNow();
    var req = new XMLHttpRequest();
    if (preferences.minMagnitude.value >= 50) {
        req.open("GET", "http://earthquake.usgs.gov/recenteqsww/catalogs/eqs7day-M5.xml", false);
        minLoadedMagnitude = 50;
    } else {
        req.open("GET", "http://earthquake.usgs.gov/recenteqsww/catalogs/eqs7day-M2.5.xml", false);
        minLoadedMagnitude = 25;
    }
    req.send();
    Loading.visible = false;
    updateNow();
    doc = XMLDOM.parse(req.responseText);
    if (!doc.documentElement) {
        RetryTimer.ticking = true;
        Error.visible = true;
        return;
    }
    items = doc.documentElement.getElementsByTagName("item");
    print("  "+items.length+" quakes loaded");
    if (items.length > 0) {
        clear();
        for (var i = 0; i < items.length; i++) {
            var x = items.item(i);
            q = new Object();
            q.title = x.getElementsByTagName("title").item(0).firstChild.nodeValue;
            q.date = x.getElementsByTagName("description").item(0).firstChild.nodeValue;
            q.link = x.getElementsByTagName("link").item(0).firstChild.nodeValue;
            q.lat = parseFloat(x.getElementsByTagName("geo:lat").item(0).firstChild.nodeValue);
            q.lon = parseFloat(x.getElementsByTagName("geo:long").item(0).firstChild.nodeValue);
            q.mag = parseFloat(q.title.substring(2, q.title.indexOf(',')));
            quakes[quakes.length] = q;
        }
        refresh();
    }
}

function refresh()
{
    var zoom = toint(preferences.zoom.value);
    print("refresh zoom="+zoom);
    var now = new Date();
    clearDisplay();
    for (var i = 0; i < quakes.length; i++) {
        var q = quakes[i];
        if (q.mag*10 < preferences.minMagnitude.value) {
            continue;
        }
        if (zoom == 1) {
            if (preferences.mapType.value == "ringoffire") {
                mx = (MapWindow.width * (q.lon + 180) / 360 + 200) % MapWindow.width;
            } else {
                mx = MapWindow.width * (q.lon + 180) / 360;
            }
            my = MapWindow.height * (90 - q.lat) / 180;
        } else {
            mx = Map.width * (2048 * (q.lon + 180) / 360 - toint(preferences.zoomX.value)) / 2048 + MapWindow.width/2;
            if (mx < 0) {
                mx += Map.width;
            } else if (mx > Map.width) {
                mx -= Map.width;
            }
            my = Map.height * (1024 * (90 - q.lat) / 180 - toint(preferences.zoomY.value)) / 1024 + MapWindow.height/2;
        }
        var menu = new Array();
        menu[0] = new MenuItem();
        menu[0].title = "Open quake info ("+q.title+")";
        menu[0].onSelect = "openURL(\""+q.link+"\")";
        menu[1] = new MenuItem();
        menu[1].title = "Center";
        menu[1].onSelect = "doZoom(toint(preferences.zoom.value), "+mx+", "+my+")";
        menu[1].enabled = zoom > 1;
        menu[2] = new MenuItem();
        menu[2].title = "Zoom in";
        menu[2].onSelect = "doZoom(toint(preferences.zoom.value)*2, "+mx+", "+my+")";
        menu[2].enabled = zoom < 16;
        menu[3] = new MenuItem();
        menu[3].title = "Zoom out";
        menu[3].onSelect = "doZoom(toint(preferences.zoom.value)/2, "+mx+", "+my+")";
        menu[3].enabled = zoom > 1;
        menu[4] = new MenuItem();
        menu[4].title = "Zoom to full map";
        menu[4].onSelect = "doZoom(1, 0, 0)";
        menu[4].enabled = zoom > 1;
        mx += MapWindow.hOffset;
        my += MapWindow.vOffset;
        var c = new Image();
        if (now.getTime() - Date.parse(q.date) < 86400000) {
            c.src = "Resources/circle.png";
        } else {
            c.src = "Resources/circle-old.png";
        }
        c.hAlign = "center";
        c.vAlign = "center";
        c.hOffset = mx;
        c.vOffset = my;
        c.width = Math.exp(q.mag) / 30;
        if (c.width < 6) {
            c.width = 6;
        }
        if (c.width > 70) {
            c.width = 70;
        }
        c.height = c.width;
        c.tooltip = q.title + "\n" + q.date + "\n(" + ago(q.date) + ")";
        c.window = Main;
        c.onMultiClick = menu[0].onSelect;
        c.contextMenuItems = menu;
        var t = null;
        if (q.mag > 6.5) {
            t = new Text();
            t.data = q.mag;
            t.color = "#ffffff";
            t.hAlign = "center";
            t.hOffset = mx;
            t.vOffset = my + 4;
            t.size = 10;
            t.style = "bold";
            t.tooltip = c.tooltip;
            t.window = Main;
            t.onMultiClick = menu[0].onSelect;
            t.contextMenuItems = menu;
        }
        q.circle = c;
        q.label = t;
        if (zoom == 1) {
            updateNow();
        }
    }
}

function doZoom(newZoom, x, y)
{
    if (newZoom < 1) {
        newZoom = 1;
    }
    if (newZoom > 16) {
        newZoom = 16;
    }
    var zoom = toint(preferences.zoom.value);
    if (zoom == 1) {
        preferences.zoomX.value = 2048 * x / MapWindow.width;
        preferences.zoomY.value = 1024 * y / MapWindow.height;
        if (preferences.mapType.value == "ringoffire") {
            preferences.zoomX.value = (preferences.zoomX.value + 2048 - 2048*(200/350)) % 2048;
        }
    } else {
        preferences.zoomX.value = toint(preferences.zoomX.value) + 8/zoom * (x - MapWindow.width/2);
        preferences.zoomY.value = toint(preferences.zoomY.value) + 8/zoom * (y - MapWindow.height/2);
    }
    preferences.zoomX.value = (toint(preferences.zoomX.value) + 2048) % 2048;
    preferences.zoom.value = newZoom;
    resetMap(true);
}

function checkReload()
{
    clearDisplay();
    if (preferences.minMagnitude.value < minLoadedMagnitude) {
        resetMap(false);
        reload();
    } else {
        resetMap(true);
    }
}

if (toint(preferences.zoom.value) < 1) {
    preferences.zoom.value = 1;
} else if (toint(preferences.zoom.value) > 16) {
    preferences.zoom.value = 16;
}

var menu = new Array();
menu[0] = new MenuItem();
menu[0].title = "Center";
menu[0].onSelect = "doZoom(toint(preferences.zoom.value), system.event.screenX - Main.hOffset - MapWindow.hOffset, system.event.screenY - Main.vOffset - MapWindow.vOffset)";
menu[1] = new MenuItem();
menu[1].title = "Zoom in";
menu[1].onSelect = "doZoom(toint(preferences.zoom.value)*2, system.event.screenX - Main.hOffset - MapWindow.hOffset, system.event.screenY - Main.vOffset - MapWindow.vOffset)";
menu[2] = new MenuItem();
menu[2].title = "Zoom out";
menu[2].onSelect = "doZoom(toint(preferences.zoom.value)/2, system.event.screenX - Main.hOffset - MapWindow.hOffset, system.event.screenY - Main.vOffset - MapWindow.vOffset)";
menu[3] = new MenuItem();
menu[3].title = "Zoom to full map";
menu[3].onSelect = "doZoom(1, 0, 0)";
Map.contextMenuItems = menu;
Map2.contextMenuItems = menu;

// There's a minor bug in the Windows version of the widget engine
// that displays one more tick mark than requested. Since we want exactly
// eight tick marks (from magnitude 2.5 to 6.0 by 0.5, tweak the ticks
// value on Windows. Presumably this will need to change if this bug
// is corrected in a future version of the widget engine.
if (system.platform == "windows" /*&& konfabulatorVersion() == "3.0.2"*/) {
    preferences.minMagnitude.ticks--;
}

resetMap(false);
updateNow();
reload();
