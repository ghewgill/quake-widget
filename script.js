/*
var url = new URL();
quakes = url.fetch("http://neic.usgs.gov/neis/finger/quake.asc");
a = quakes.split("\n");
for (var i = 0; i < a.length; i++) {
    if (a[i][0] == '0') {
        var lat = a[i].substring(19, 5);
        if (a[i].charAt(24) == 'S') {
            lat = -lat;
        }
        var lon = a[i].substring(26, 6);
        if (a[i].charAt(32) == 'W') {
            lon = -lon;
        }
        var mag = a[i].substring(40, 3);
        var place = a[i].substring(49);
        print(lat,lon,mag,place);
    }
}
*/

/*
var url = new URL();
url.outputFile = system.widgetDataFolder+"/quakes.xml.gz";
url.fetch("http://earthquake.usgs.gov/recenteqsww/catalogs/merged_catalog.xml.gz");
xml = runCommand("gunzip -c \""+url.outputFile+"\"");
doc = XMLDOM.parse(xml);
events = doc.documentElement.getElementsByTagName("event");
for (var i = 0; i < events.length; i++) {
    var lat = events.item(i).evaluate("string(param[@name='latitude']/@value)");
    var lon = events.item(i).evaluate("string(param[@name='longitude']/@value)");
    print(lat, lon);
}
*/

function resetMap()
{
    if (preferences.mapType.value == "ringoffire") {
        Map.visible = false;
        MapE.visible = true;
        MapW.visible = true;
    } else {
        Map.visible = true;
        MapE.visible = false;
        MapW.visible = false;
    }
    refresh();
}

var quakes = [];

function clear()
{
    for (var i = 0; i < quakes.length; ++i) {
        quakes[i].circle.removeFromSuperview();
        if (quakes[i].label) {
            quakes[i].label.removeFromSuperview();
        }
    }
    quakes = [];
}

function reload()
{
    print("reloading from earthquake.usgs.gov");
    var req = new XMLHttpRequest();
    req.open("GET", "http://earthquake.usgs.gov/recenteqsww/catalogs/eqs7day-M5.xml", false);
    req.send();
    doc = XMLDOM.parse(req.responseText);
    items = doc.documentElement.getElementsByTagName("item");
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
    print("refresh");
    var now = new Date();
    for (var i = 0; i < quakes.length; i++) {
        var q = quakes[i];
        if (preferences.mapType.value == "ringoffire") {
            mx = Map.width * ((q.lon + 180 + 200) % 360) / 360;
        } else {
            mx = Map.width * (q.lon + 180) / 360;
        }
        my = Map.height * (90 - q.lat) / 180;
        var menu = new Array();
        menu[0] = new MenuItem();
        menu[0].title = "Open quake info ("+q.title+")";
        menu[0].onSelect = "openURL(\""+q.link+"\")";
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
            t.contextMenuItems = menu;
        }
        if (q.circle) {
            q.circle.removeFromSuperview();
        }
        if (q.label) {
            q.label.removeFromSuperview();
        }
        q.circle = c;
        q.label = t;
    }
}

resetMap();
updateNow();
reload();
