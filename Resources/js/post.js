
    var val = '', buttonValue = 'Post';

    var replyID = Titanium.App.Properties.getInt('replyID');
    
    TT.log('[POST]: replyID: ' + replyID);

    if (replyID > 0) {
        var replyName = Titanium.App.Properties.getString('replyTo');
        TT.log('[POST]: replyName: ' + replyName);

        Titanium.App.Properties.setString('replyTo', '');
        Titanium.App.Properties.setInt('replyID', 0);
        val = '@' + replyName + ' ';
        document.title = 'Titweeter: Reply to @' + replyName;
        buttonValue = 'Reply';
    }

    var ta1 = Titanium.UI.createTextArea({
        id: 'post_status', 
        value: val,
        height: 100,
        width: 300,
        borderStyle: Titanium.UI.INPUT_BORDERSTYLE_BEZEL,
        returnKeyType: Titanium.UI.RETURNKEY_SEND
    });
    
    var c = document.getElementById('charCount');


    var countChars = function(e) {
        var len = e.value.length,
            left = (140 - len);
        if (left < 0) {
            c.innerHTML = '<strong>' + left + '</strong> Chars left';
        } else {
            c.innerHTML = left + ' Chars left';
        }
    };

    ta1.addEventListener('change', countChars);

    ta1.addEventListener('return', function(e) {
        TT.log('return');
        postStatus();
    });

    var button = Titanium.UI.createButton({
        id: 'post_button',
        title: buttonValue,
        color: '#000',
        height: 32,
        width: 75,
        fontSize: 12,
        fontWeight: 'bold'
    });
    
    button.addEventListener('click', function() {
        postStatus();
    });

    var postStatus = function() {
        TT.log('Post Status: ' + ta1.value);
        TT.showLoading('Posting...');
        Titanium.Geolocation.getCurrentPosition(function(e) {
            TT.log('Coords: ' + e.coords.latitude + ' :: ' + e.coords.longitude);
            postStatusReal(e);
        }, function(e) {
            TT.log('Coords Failed');
            postStatusReal(e);
        });
    };

    var postStatusReal = function(e) {
        TT.log('postStatusReal: ' + ta1.value);
        var creds = TT.getCreds();
        var c = {
            status: ta1.value
        };

        if (replyID > 0) {
            TT.log('Reply to: ' + replyID);
            c.in_reply_to_status_id = replyID;
        }

        if (e.coords) {
            c.lat = e.coords.latitude;
            c.long = e.coords.longitude;
        }

        var url = 'https:/'+'/' + creds.login + ':' + creds.passwd + '@twitter.com/statuses/update.json';

        TT.log('URL: ' + url);
        var xhr = Titanium.Network.createHTTPClient();
        xhr.onreadystatechange = function() {
            TT.log('[' + this.readyState + ']');
        };

        xhr.onload = function() {
            TT.hideLoading();
            Titanium.currentWindow.close();
        };
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
        //xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        //xhr.send("status=" + Titanium.Network.encodeURIComponent(ta1.value));
        xhr.send("status=" + Titanium.Network.encodeURIComponent('This is a test.'));
        //xhr.send(c);
    };
    
    ta1.focus();
    