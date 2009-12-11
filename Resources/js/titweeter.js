
var Y, db,
    bitly = {
        username: 'davglass',
        key: 'R_6c177964b29afb4bd3e40e14c1531ced'
    };

YUI().use('*', function(Yc) {
    Y = Yc;
});



var TT = {
    openDB: function() {
        db = Titanium.Database.open('titweeter');

        //db.execute('drop table tweets');
        db.execute('create table if not exists tweets (id integer, screen_name text, type text, json text)');

        //db.execute('delete from tweets');
    },
    closeDB: function() {
        db.close();
    },
    lastID: null,
    firstID: null,
    log: function(str) {
        Titanium.API.log('debug', str);
    },
    alert: function(str) {
        TT.hideLoading();
        var a = Titanium.UI.createAlertDialog();
        a.setTitle('Alert');
        a.setMessage(str);
        a.show(); 
    },
    showError: function(str) {
        TT.hideLoading();
        var a = Titanium.UI.createAlertDialog();
        a.setTitle('Error');
        a.setMessage(str);
        a.show(); 
    },
    not: function(str) {
        TT.hideLoading();
        var a = Titanium.UI.createAlertDialog();
        a.setTitle('Not Implemented Yet');
        a.setMessage(str);
        a.show(); 
    },
    proto: 'http',
    _loading: null,
    showLoading: function(str, bar) {
        TT.log('show loading indicator');
        var ind;
        str = ((str) ? str : 'Loading..');
        if (TT._loading) {
            ind = TT._loading
        } else {
            var ind = Titanium.UI.createActivityIndicator();
        }
        ind.setMessage(str);
        if (bar) {
            ind.setLocation(Titanium.UI.ActivityIndicator.STATUS_BAR);
        } else {
            ind.setLocation(Titanium.UI.ActivityIndicator.DIALOG);
        }
        ind.setType(Titanium.UI.ActivityIndicator.INDETERMINANT);
        ind.show();
        TT._loading = ind;
    },
    hideLoading: function() {
        TT.log('hide loading indicator');
        if (TT._loading) {
            TT._loading.hide();
        }
    },
    setCreds: function(l, p) {
        Titanium.App.Properties.setString('LOGIN', l);
        Titanium.App.Properties.setString('PASSWD', p);
    },
    showImage: function(url) {
        TT.log('showImage: ' + url);
        var ImageWindow = Titanium.UI.createWindow({
            url: url,
            hideTabBar: 'true',
            hideNavBar: 'true'
        });
        ImageWindow.open({
            modal: true,
            animated: true
        });
    },
    fetchURL: function(url, cb) {
        if (Titanium.Network.NETWORK_NONE) {
            TT.showError('No network connection.');
            return false;
        }
        var creds = TT.getCreds(),
            proto = TT.proto + ':/'+'/' + creds.login + ':' + creds.passwd + '@';
        
        if (url.indexOf('search') !== -1) {
            proto = 'http:/'+'/search.';
        }
        var xhr = Titanium.Network.createHTTPClient(),
            meth = 'GET', o = null,
            url =  proto + 'twitter.com/' + url;

        if (cb) {
            if (cb.type) {
                meth = cb.type;
            }
            if (cb.data) {
                o = TT.stringifyObject(cb.data);
            }
            if (cb.onload) {    
                xhr.onload = function() {
                    if (this.responseText == 'Bad Gateway') {
                        TT.hideLoading();
                        TT.showError('Fail Whale!!');
                    } else {
                        cb.onload.apply(this);
                    }
                };
            }
        }

        xhr.onerror = function() {
            var err = this.getStatusText();
            TT.log('[ERROR]: Status Text: ' + err);
            switch (err) {
                case 'Bad Gateway':
                    err = 'Fail Whale';
                    break;
                case undefined:
                    err = 'Twitter failed to load.';
                    break;
            }
            TT.showError(err);
            if (cb.onerror) {
                cb.onerror.apply(this);
            }
        };
        
        TT.log('Method: ' + meth);
        TT.log('URL: ' + url);
        TT.log('Send: ' + o);
        xhr.open(meth, url);
        xhr.send(o);
    },
    stringifyObject: function(o) {
        var str = '', i;
        for (i in o) {
            str += '&' + i + '=' + Titanium.Network.encodeURIComponent(o[i]);
        }
        return str;
    },
    getCreds: function() {
        var creds = {
            login: Titanium.App.Properties.getString('LOGIN'),
            passwd: Titanium.App.Properties.getString('PASSWD')
        };

        TT.creds = creds;

        return creds;
    },
    toRelativeTime: function(d, from) {
        d = d || new Date();
        from = from || new Date();

        var delta = (from.getTime() - d.getTime()) / 1000;

        return delta < 5      ? TT.strings.now :
               delta < 60     ? TT.strings.seconds :
               delta < 120    ? TT.strings.minute :
               delta < 3600   ? TT.strings.minutes.
                                    replace(/X/, Math.floor(delta/60)) :
               delta < 7200   ? TT.strings.hour :
               delta < 86400  ? TT.strings.hours.
                                    replace(/X/, Math.floor(delta/3600)) :
               delta < 172800 ? TT.strings.day :

               TT.strings.days.replace(/X/, Math.floor(delta/86400));
    },
    strings: {
        now     : "right now",
        seconds : "less than a minute ago",
        minute  : "about a minute ago",
        minutes : "X minutes ago",
        hour    : "about an hour ago",
        hours   : "about X hours ago",
        day     : "1 day ago" ,
        days    : "X days ago"
    },
    getTrueStatus: function(d) {
        if (d.retweeted_status) {
            return d.retweeted_status;
        } else {
            return d;
        }
    },
    showProfile: function(user) {
        TT.log('Loading ShowProfile: ' + user.id);
        Titanium.App.Properties.setString('currentUser', user.id);
        win = Titanium.UI.createWindow({ url: 'profile.html' });
        win.open();
    },
    holder: function() {},
    statuses: {},
    showTimeline: function() {
        TT.showLoading('Fetching Timeline Cache..');
        TT.openDB();
        var rows = db.execute('select * from tweets where (type = "timeline") order by id desc'), 
            v;

        TT.log('Loading ' + rows.getRowCount() + ' items from cache');
        
        if (rows.getRowCount() == 0) {
            TT.showTimeline_new();
            return;
        }

        var ul = Y.one('#timeline ul');
        
        while (rows.isValidRow()) {
            //TT.log('Loading Cache: ' + rows.fieldByName('id') + ' :: ' + rows.fieldByName('screen_name'));
            v = TT.formatTimelineRow(Y.JSON.parse(rows.fieldByName('json')));
            var cls = ((v.me) ? ' class="mine"' : '');
            var li = Y.Node.create('<li id="' + v.id + '" ' + cls + '><h2>' + v.header + '</h2><img src="' + v.photo + '"><div class="text">' + TT.filterStatus(v.message) + '</div></li>');
            ul.append(li);
            
            if (!TT.lastID) {
                TT.lastID = v.id;
            }
            TT.firstID = v.id;
            rows.next();
            TT.statuses[v.id] = v;
        }
        // close database
        rows.close();
        TT.closeDB();

        TT.hideLoading();

        TT.createTimelineMenu();
        window.setTimeout(TT.updateTimelines, 200);
        TT.setTimer();
    },
    setTimer: function() {
        TT.checker = window.setInterval(TT.updateTimelines, ((TT.settings.check_time * 1000) * 60));
    },
    cancelTimer: function() {
        clearInterval(TT.checker);
    },
    showTimeline_new: function(t, q) {
        TT.log('ShowTimeline_new: ' + t + ' :: ' + q);
        var title = 'Timeline';
        t = ((t) ? t : 'home_timeline');
        var cache = ((t) ? t : 'timeline');
        var qs = 'count=';


        switch (t) {
            case 'direct_messages':
                title = 'Direct Messages';
                break;
            case 'mentions':
                title = 'Mentions';
                t = 'statuses/' + t;
                break;
            case 'search':
                title = 'Search';
                t = 'search';
                qs = 'q=' + encodeURIComponent(q) + '&rpp=20&foo=';
                break;
            default:
                t = 'statuses/' + t;
                break;
        }

        TT.showLoading('Fetching ' + title + '.. ');
        TT.fetchURL(t + '.json?' + qs + TT.settings.num_items , {
            onload: function() {
                TT.showLoading('Parsing Timeline..');
                TT.log('TimelineXHR Loaded');
                var json = eval('(' + this.responseText + ')'),
                    set = true, c = 0, row, info,
                    data = [];

                if (json.query) {
                    json = json.results;
                }

                for (var c = 0; c < json.length; c++) {
                    var row = json[c];
                    if (!TT.lastID) {
                        TT.lastID = row.id;
                    }
                    TT.firstID = row.id;
                    info = TT.formatTimelineRow(row, cache);
                    data.push(info);
                }
                
                TT.showLoading('Using YUI3 to load Timeline...');
                var ul = Y.one('#timeline ul');

                Y.each(data, function(v) {
                    var cls = ((v.me) ? ' class="mine"' : '');
                    //TT.log('Header: ' + v.header);
                    var li = Y.Node.create('<li id="' + v.id + '" ' + cls + '><h2>' + v.header + '</h2><img src="' + v.photo + '"><div class="text">' + TT.filterStatus(v.message) + '</div></li>');
                    ul.append(li);
                });
                
                TT.hideLoading();
                if (t === 'home_timeline') {
                    TT.setTimer();
                }
            },
            onerror: function() {
                TT.log('Status Text: ' + this.getStatusText());
                TT.log('Response: ' + this.getResponseText());
            }
        });
        
        switch (t) {
            case 'mentions':
                TT.createMentionsMenu();
                break;
            case 'direct_messages':
                TT.createDirectsMenu();
                break;
            case 'search':
                break;
            default:
                Titanium.Analytics.featureEvent('new.timeline');
                TT.createTimelineMenu();
                break;
        }
    },
    createDirectsMenu: function() {
        var menu = Titanium.UI.createMenu();

        Titanium.Gesture.addEventListener('shake',function(e) {
            TT.updateTimelines('direct_messages');
        });

        menu.addItem("Refresh", function() {
            TT.log('Menu: Refresh Timeline');
            TT.updateTimelines('direct_messages');
        }/*, Titanium.UI.Android.SystemIcon.VIEW*/);

        menu.addItem("Timeline", function() {
            TT.log('Menu: Timeline');
            Titanium.UI.currentWindow.close();
        }/*, Titanium.UI.Android.SystemIcon.ZOOM*/);

        menu.addItem("Friends", function() {
            TT.log('Menu: Friends');
            TT.showFriends();
        }/*, Titanium.UI.Android.SystemIcon.SEARCH*/);

        menu.addItem("Search", function() {
            TT.log('Menu: Search');
            win = Titanium.UI.createWindow({ url: 'search.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.SEARCH*/);

        menu.addItem("Settings", function() {
            TT.log('Menu: Settings');
            TT.showSettings();
        }/*, Titanium.UI.Android.SystemIcon.PREFERENCES*/);

        Titanium.UI.setMenu(menu);
    },
    createMentionsMenu: function() {
        var menu = Titanium.UI.createMenu();

        menu.addItem("Post", function() {
            win = Titanium.UI.createWindow({ url: 'post.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.COMPOSE*/);
        
        Titanium.Gesture.addEventListener('shake',function(e) {
            TT.updateTimelines('mentions');
        }); 

        menu.addItem("Refresh", function() {
            TT.log('Menu: Refresh Timeline');
            TT.updateTimelines('mentions');
        }/*, Titanium.UI.Android.SystemIcon.VIEW*/);

        menu.addItem("Timeline", function() {
            TT.log('Menu: Timeline');
            Titanium.UI.currentWindow.close();
        }/*, Titanium.UI.Android.SystemIcon.ZOOM*/);

        menu.addItem("Directs", function() {
            TT.log('Menu: Directs');
            win = Titanium.UI.createWindow({ url: 'directs.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.SEND*/);

        menu.addItem("Friends", function() {
            TT.log('Menu: Friends');
            TT.showFriends();
        }/*, Titanium.UI.Android.SystemIcon.SEARCH*/);

        menu.addItem("Search", function() {
            TT.log('Menu: Search');
            win = Titanium.UI.createWindow({ url: 'search.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.SEARCH*/);

        menu.addItem("Settings", function() {
            TT.log('Menu: Settings');
            TT.showSettings();
        }/*, Titanium.UI.Android.SystemIcon.PREFERENCES*/);

        Titanium.UI.setMenu(menu);
    },
    createTimelineMenu: function() {
        var menu = Titanium.UI.createMenu();

        menu.addItem("Post", function() {
            win = Titanium.UI.createWindow({ url: 'post.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.COMPOSE*/);

        Titanium.Gesture.addEventListener('shake',function(e) {
            TT.updateTimelines();
        }); 

        menu.addItem("Refresh", function() {
            TT.log('Menu: Refresh Timeline');
            TT.updateTimelines();
        }/*, Titanium.UI.Android.SystemIcon.VIEW*/);

        menu.addItem("Mentions", function() {
            TT.log('Menu: Mentions');
            win = Titanium.UI.createWindow({ url: 'mentions.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.ZOOM*/);

        menu.addItem("Directs", function() {
            TT.log('Menu: Directs');
            win = Titanium.UI.createWindow({ url: 'directs.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.SEND*/);

        menu.addItem("Friends", function() {
            TT.log('Menu: Friends');
            TT.showFriends();
        }/*, Titanium.UI.Android.SystemIcon.SEARCH*/);

        menu.addItem("Search", function() {
            TT.log('Menu: Search');
            win = Titanium.UI.createWindow({ url: 'search.html' });
            win.open();
        }/*, Titanium.UI.Android.SystemIcon.SEARCH*/);

        menu.addItem("Settings", function() {
            TT.log('Menu: Settings');
            TT.showSettings();
        }/*, Titanium.UI.Android.SystemIcon.PREFERENCES*/);

        Titanium.UI.setMenu(menu);
    },
    showFriends: function() {
        win = Titanium.UI.createWindow({ url: 'friends.html' });
        win.open();
    },
    showMentions: function() {
        Titanium.Analytics.featureEvent('show.mentions');
        TT.showTimeline_new('mentions');
    },
    showDirects: function() {
        Titanium.Analytics.featureEvent('show.directs');
        TT.showTimeline_new('direct_messages');
    },
    showSearch: function(q) {
        Titanium.Analytics.featureEvent('show.search');
        TT.showTimeline_new('search', q);
    },
    filterStatus: function(txt) {
        //Filter URL's
        txt = txt.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/g, function(url) {
            return '<a href="' + url + '" class="url">' + url + '</a>';
        });
        
        //Filter @messages
        //Hook profile view up here..
        txt = txt.replace(/[@]+[A-Za-z0-9-_]+/g, function(f, n, s) {
            return '<a href="http:/'+'/twitter.com/' + f.replace('@', '') + '" class="profile">' + f + '</a>';
        });
        
        //Filter #hashtags
        //Hook search view up here..
        txt = txt.replace(/[#]+[A-Za-z0-9-_]+/g, function(f, n, s) {
            //return '<a href="http:/'+'/search.twitter.com/search?q=' + f.replace('#', '%23') + '" class="search">' + f + '</a>';
            return '<a href="' + f + '" class="search">' + f + '</a>';
        });
        
        return txt;
    },
    html_entity_decode: function(str) {
        var ta = document.createElement('textarea');
        ta.innerHTML = str.replace(/</g,"&lt;").replace(/>/g,"&gt;");
        return ta.value;
    },
    formatTimelineRow: function(row, cache) {
        var d = '<em>' + TT.toRelativeTime(new Date(row.created_at)) + '</em>',
            s = TT.html_entity_decode(row.source), a,
            div = document.createElement('div'),
            txt = row.text;

        if (row.sender_id) {
            //Direct Message Formatting
            row.user = row.sender;
            s = 'direct message';
        }

        if (row.from_user_id) {
            row.user = {
                id: row.from_user_id,
                profile_image_url: row.profile_image_url,
                name: row.from_user
            };
        }

        var username = row.user.name,
            user = row.user,
            img = row.user.profile_image_url;
 

        div.innerHTML = s;
        a = div.firstChild;
        if (a && a.nodeName == 'A') {
            s = a.innerHTML;
        }

        s = ' from ' + s;
        if (row.in_reply_to_status_id) {
            s = ' in reply to ' + row.in_reply_to_screen_name;
        }

        if (row.retweeted_status) {
            username = row.retweeted_status.user.name;
            img = row.retweeted_status.user.profile_image_url;
            txt = row.retweeted_status.text;
            user = row.retweeted_status.user;
            s = ' retweeted by ' + row.user.name + ' ' + d;
            d = '';
        }
        
        var info = {
            id: row.id,
            created_at: row.created_at,
            user: user,
            user_id: user.id,
            message: txt,
            photo: img,
            header: username + ': ' + d + s,
            json: row,
            me: false,
            geo: false
        };


        Y.each(row, function(v, k) {
            if (!info[k]) {
                info[k] = v;
            }
        });

        if (row.user.screen_name == TT.creds.login) {
            info.me = true;
        }

        if (row.geo) {
            info.geo = row.geo.coordinates;
            info.header = info.header += ' <img src="css/map.gif">';
        }

        if (!TT.statuses[row.id]) {
            TT.statuses[row.id] = row;
        }
        
        if (!cache) {
            cache = 'status';
        }
        TT.openDB();
        var rows = db.execute('select * from tweets where (id = ' + info.id + ')');
        if (rows.isValidRow()) {
            rows.next();
        } else {
            var sql = 'insert into tweets (id, screen_name, type, json) values (?, ?, ?, ?)';
            db.execute(sql, info.id, info.user.screen_name, cache, Titanium._JSON(row));
        }
        rows.close();
        TT.closeDB();

        return info;
        
    },
    updateTimelines: function(t) {
        TT.log('updateTimelines: ' + new Date());
        TT.showLoading('reloading', true);
        
        t = ((t) ? t : 'home_timeline');

        TT.updateTimeStamps();
        
        var url = 'statuses/' + t + '.json?count=' + TT.settings.num_items;
            if (TT.lastID) {
                url = 'statuses/' + t + '.json?since_id=' + TT.lastID;
            }
        TT.fetchURL(url, {
            onload: function() {
                TT.log('TimelineUpdateXHR Loaded');
                var json = eval('(' + this.responseText + ')'),
                    set = true, c = 0, row, info, data = [],
                    f = Y.one('#timeline ul li'),
                    ul = Y.one('#timeline ul');

                for (c = 0; c < json.length; c++) {
                    row = json[c];
                    if (set) {
                        TT.lastID = row.id;
                        set = false;
                    }
                    TT.firstID = row.id;
                    info = TT.formatTimelineRow(row, 'timeline');
                    var cls = ((info.me) ? ' class="mine"' : '');
                    //TT.log('Update Header: ' + info.header);
                    var li = Y.Node.create('<li id="' + info.id + '" ' + cls + '><h2>' + info.header + '</h2><img src="' + info.photo + '"><div class="text">' + TT.filterStatus(info.message) + '</div></li>');
                    ul.insertBefore(li, f);
                }

                TT.hideLoading();
            },
            onerror: function() {
                TT.log('Status Text: ' + this.getStatusText());
                TT.log('Response: ' + this.getResponseText());
            }
        });
    },
    updateTimeStamps: function() {
        TT.log('update time stamps');
        var ems = Y.all('#timeline em');
        TT.log('Updating ' + ems.size() + ' stamps');
        ems.each(function(v) {
            var id = v.get('parentNode.parentNode.id');
            //TT.log(Y.JSON.stringify(TT.statuses[id]));
            var str = TT.toRelativeTime(new Date(TT.statuses[id].created_at));
            v.set('innerHTML', str);
        });
    },
    showSettings: function() {
        TT.log('TT.showSettings');
        var win = Titanium.UI.createWindow({ url: 'settings.html', fullscreen: true });
        win.open();
    },
    formatProfileHeader: function(user) {
        Y.one('#status img').set('src', user.profile_image_url).on('click', TT.showUserProfile);
        Y.one('#status h1').set('innerHTML', user.name).on('click', TT.showUserProfile);
        Y.one('#status h3').set('innerHTML', '@' + user.screen_name).on('click', TT.showUserProfile);
        Y.one('#status em').set('innerHTML', user.followers_count);
        Y.one('#status strong').set('innerHTML', user.friends_count);
        Y.one('#status span').set('innerHTML', user.statuses_count);
        if (user.url) {
            Y.one('#status a.url').set('href', user.url).set('innerHTML', user.url).removeClass('hidden');
        }
        Y.one('#status p').set('innerHTML', user.description);
    },
    showUserProfile: function(e) {
        if (e) {
            e.halt();
        }
        TT.showProfile({ id: stat.user.screen_name });
    },
    settings: {
        check_time: 15,
        num_items: 50,
        bitly: '1',
        enter: '0',
        https: '0',
        geo: '1',
        proimage: '1'
    },
    loadSettings: function() {
        if (Y && Y.each) {
            Y.each(TT.settings, function(v, k) {
                var title = 'SETTING_' + k.toUpperCase();
                //TT.log('[SETTINGS]: ' + title);
                var setting = Titanium.App.Properties.getString(title);
                if (setting) {
                    v = setting;
                }
                Titanium.App.Properties.setString(title, v);
                TT.settings[k] = v;
            });
            
            TT.proto = 'http';
            if (TT.settings.https == '1') {
                TT.proto = 'https';
            }
            if (TT.settings.proimage == '1') {
                Y.one('body').removeClass('hide-proimage');
            } else {
                Y.one('body').addClass('hide-proimage');
            }
            //TT.log('[SETTINGS]: ' + Y.JSON.stringify(TT.settings));
        }
    }
};

Titanium.UI.currentWindow.addEventListener('focused', function() {
    TT.getCreds();
    TT.loadSettings();
});

TT.getCreds();
TT.loadSettings();

Y.delegate('click', function(e) {
    var tar = e.currentTarget,
        cls = tar.get('className'),
        href = tar.getAttribute('href', 2);
    
    TT.log('[DELEGATE]: Click: ' + cls);
    switch (cls) {
        case 'profile':
            TT.showProfile({ id: href.replace('http:/'+'/twitter.com/', '') });
            e.halt();
            break;
        case 'search':
                Titanium.App.Properties.setString('SEARCH', href);
                win = Titanium.UI.createWindow({ url: 'search.html' });
                win.open();
                break;
        case 'url':
            if (href.indexOf('twitpic.com') !== -1) {
                e.halt();
                TT.log('Found Twitpic URL');
                //Filter TwitPic
                var url = href.replace('http:/'+'/twitpic.com/', 'http:/'+'/twitpic.com/show/full/');
                TT.log('Twitpic URL: ' + url);
                TT.showImage(url);
            }
            if (TT.settings.bitly == '1') {
                if (href.indexOf('bit.ly') !== -1) {
                    e.halt();
                    TT.log('Found Bitly URL');
                    TT.showLoading('Expanding Url');
                    var xhr = Titanium.Network.createHTTPClient();
                    xhr.onload = function() {
                        TT.log('Bitly reponse: ' + this.responseText);
                        var json = Y.JSON.parse(this.responseText);
                        Y.each(json.results, function(v) {
                            var url = v.longUrl;
                            tar.set('href', url).set('innerHTML', url);
                        });
                        TT.hideLoading();
                    };
                    var o = TT.stringifyObject({
                        login: bitly.username,
                        apiKey: bitly.key,
                        version: '2.0.1',
                        format: 'json',
                        shortUrl: href
                    });
                    xhr.open('GET', 'http:/'+'/api.bit.ly/expand?' + o);
                    xhr.send(null);
                }
            }
            //TODO
            break;
    }
}, 'body', 'a');

Y.delegate('click', function(e) {
    var id = e.currentTarget.get('parentNode.id'),
    status = TT.getTrueStatus(TT.statuses[id]);

    TT.log('Clicked on profile image: ' + id);
    TT.showProfile(status.user);
}, '#timeline', 'img');

Y.delegate('click', function(e) {
    if (!e.target.test('a')) {
        var id = e.currentTarget.get('parentNode.id'),
        status = TT.getTrueStatus(TT.statuses[id]);
        TT.log('currentStatus: ' + status.id);

        Titanium.App.Properties.setString('currentStatus', status.id);
        Titanium.App.Properties.setList('currentStatusList', status);

        TT.log('Create status window..');
        
        var win = Titanium.UI.createWindow({ url: 'status.html' });
        win.open();
    }
}, 'body', 'div.text');

