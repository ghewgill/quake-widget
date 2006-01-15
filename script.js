var quakes = [];
var minLoadedMagnitude;
var zoom = 1;
var zoomX, zoomY;

function resetMap()
{
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
        Map.hOffset = -zoomX/8*zoom + MapWindow.width/2;
        Map.vOffset = -zoomY/8*zoom + MapWindow.height/2;
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
    refresh();
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
            mx = Map.width * (2048 * (q.lon + 180) / 360 - zoomX) / 2048 + MapWindow.width/2;
            my = Map.height * (1024 * (90 - q.lat) / 180 - zoomY) / 1024 + MapWindow.height/2;
        }
        mx += MapWindow.hOffset;
        my += MapWindow.vOffset;
        var menu = new Array();
        menu[0] = new MenuItem();
        menu[0].title = "Open quake info ("+q.title+")";
        menu[0].onSelect = "openURL(\""+q.link+"\")";
        menu[1] = new MenuItem();
        menu[1].title = "Zoom in";
        menu[1].onSelect = "doZoom(zoom*2, "+(mx - MapWindow.hOffset)+", "+(my - MapWindow.vOffset)+")";
        menu[2] = new MenuItem();
        menu[2].title = "Zoom out";
        menu[2].onSelect = "doZoom(1, 0, 0)";
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
        if (c.width < 5) {
            c.width = 5;
        }
        if (c.width > 70) {
            c.width = 70;
        }
        c.height = c.width;
        c.tooltip = q.title + "\n" + q.date;
        c.window = Main;
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
            t.tooltip = q.title + "\n" + q.date;
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
    if (newZoom > 8) {
        newZoom = 8;
    }
    if (zoom == 1) {
        zoomX = 2048 * x / MapWindow.width;
        zoomY = 1024 * y / MapWindow.height;
        if (preferences.mapType.value == "ringoffire") {
            zoomX = (zoomX + 2048 - 2048*(200/350)) % 2048;
        }
    } else {
        zoomX += 8/zoom * (x - MapWindow.width/2)
        zoomY += 8/zoom * (y - MapWindow.height/2)
    }
    zoom = newZoom;
    resetMap();
}

function checkReload()
{
    if (preferences.minMagnitude.value < minLoadedMagnitude) {
        reload();
    } else {
        resetMap();
    }
}

var menu = new Array();
menu[0] = new MenuItem();
menu[0].title = "Zoom in";
menu[0].onSelect = "doZoom(zoom*2, system.event.screenX - Main.hOffset - MapWindow.hOffset, system.event.screenY - Main.vOffset - MapWindow.vOffset)";
menu[1] = new MenuItem();
menu[1].title = "Zoom out";
menu[1].onSelect = "doZoom(1, 0, 0)";
Map.contextMenuItems = menu;
Map2.contextMenuItems = menu;

if (system.platform == "windows" /*&& konfabulatorVersion() == "3.0.2"*/) {
    preferences.minMagnitude.ticks--;
}

resetMap();
updateNow();
reload();
