


Y.delegate('click', function(e) {
    e.currentTarget.one('em').toggleClass('selected');
    var ch = e.currentTarget.one('em').hasClass('selected'),
        val = '0';
        title = 'SETTING_' + e.currentTarget.one('em').get('id').toUpperCase();
    if (ch) {
        val = '1';
    }
    TT.log('[SETTING]: ' + title + ': ' + val);
    Titanium.App.Properties.setString(title, val);
}, '#settings', 'li.check');


Y.one('#num_items').on('click', function(e) {
    // create dialog
    var dialog = Titanium.UI.createOptionDialog(),
        num_options = [
            '5 Items',
            '10 Items',
            '25 Items',
            '50 Items',
            '75 Items',
            '100 Items'
        ];
        num_options_val = [
            5,
            10,
            25,
            50,
            75,
            100
        ];
    
    // set button titles

    dialog.setOptions(num_options);

    // set title
    dialog.setTitle('Number of Timeline Entries');

    // add event listener
    dialog.addEventListener('click',function(e) {
        var num = num_options_val[e.index];
        Y.one('#num_items strong').set('innerHTML', num);
        Titanium.App.Properties.setString('SETTING_NUM_ITEMS', num);
    });

    // show dialog
    dialog.show();
});


Y.one('#check_time').on('click', function(e) {
    // create dialog
    var dialog = Titanium.UI.createOptionDialog(),
        num_options = [
            '1 Minute (Development Use)',
            '5 Minutes',
            '10 Minutes',
            '15 Minutes',
            '30 Minutes',
            '45 Minutes',
            '60 Minutes'
        ];
        num_options_val = [
            1,
            5,
            10,
            15,
            30,
            45,
            60
        ];
    
    // set button titles

    dialog.setOptions(num_options);

    // set title
    dialog.setTitle('Timeline refresh interval');

    // add event listener
    dialog.addEventListener('click',function(e) {
        var num = num_options_val[e.index];
        Y.one('#check_time strong').set('innerHTML', num);
        Titanium.App.Properties.setString('SETTING_CHECK_TIME', num);
    });

    // show dialog
    dialog.show();
});


Y.one('#num_items strong').set('innerHTML', Titanium.App.Properties.getString('SETTING_NUM_ITEMS'));
Y.one('#check_time strong').set('innerHTML', Titanium.App.Properties.getString('SETTING_CHECK_TIME'));


var lis = Y.all('#settings li.check');
lis.each(function(node) {
    var em = node.one('em'),
        id = em.get('id');
    var setting = TT.settings[id];
    if (setting === '1') {
        em.addClass('selected');
    }
});

Y.one('#clear_cache').on('click', function(e) {
    var a = Titanium.UI.createAlertDialog({
        title: 'Are you sure?',
        message: 'Are you sure you want to clear the applications cache? This can not be undone.', 
        buttonNames: [ 'OK', 'Cancel']
    });
    a.addEventListener('click',function(e) {
        if (e.index == 0) {
            TT.showLoading('Clearing Application Settings');
            TT.openDB();
            db.execute('delete from tweets');
            db.execute('drop table tweets');
            Titanium.App.Properties.setString('LOGIN', '');
            Titanium.App.Properties.setString('PASSWD', '');
            Titanium.App.Properties.setString('SETTING_NUM_ITEMS', 50);

            TT.alert('Application Cache Cleared.');
            Titanium.UI.currentWindow.close();
        }
    });

    a.show(); 
});

var checkCreds = function(l, p) {
    if (l && p) {
        TT.log('Checking Creds');
        // hide the keyboards if they're showing
        var login = l,
            passwd = p,
            url = 'https:/'+'/' + login + ':' + passwd + '@twitter.com/account/verify_credentials.json',
            xhr = Titanium.Network.createHTTPClient();

            TT.showLoading('Verifing Credentials');
            TT.log('Fetching URL: ' + url);
            xhr.onload = function() {
                TT.log('Verify Creds');
                var json = eval('('+this.responseText+')');
                if (json.error) {
                    TT.log('ERROR: ' + json.error);
                    TT.showError(json.error);
                } else {
                    Titanium.Analytics.featureEvent('settings.creds'); 
                    TT.openDB();
                    db.execute('delete from tweets');
                    TT.log('setCreds..');
                    TT.setCreds(login, passwd);
                    Y.one('#check').get('parentNode').set('innerHTML', '<small>To reset, clear the App Cache.</small>');
                    Y.one('#mask').removeClass('disabled');
                    Y.one('#login').get('parentNode').set('innerHTML', 'Username: ' + l);
                    Y.one('#passwd').get('parentNode').remove();
                    
                    TT.hideLoading();
                }
            };
            xhr.open("GET",url);
            xhr.send();
    } else {
        TT.showError('Fields are required');
    }
};

var creds = TT.getCreds();
if (creds.login != '' && creds.passwd != '') {
    Y.one('#login').get('parentNode').set('innerHTML', 'Username: ' + creds.login);
    Y.one('#passwd').get('parentNode').set('innerHTML', '<small>To reset, clear the App Cache</small>');
    Y.one('#check').get('parentNode').remove();
    Y.one('#mask').removeClass('disabled');
} else {
    flogin = Titanium.UI.createTextField({
        id: 'login',
        value: '',
        keyboardType: Titanium.UI.KEYBOARD_DEFAULT,
        autocorrect: false,
        borderStyle: Titanium.UI.INPUT_BORDERSTYLE_ROUNDED
    });

    fpasswd = Titanium.UI.createTextField({
        id: 'passwd',
        value: '',
        keyboardType: Titanium.UI.KEYBOARD_DEFAULT,
        autocorrect: false,
        passwordMask: true,
        borderStyle: Titanium.UI.INPUT_BORDERSTYLE_ROUNDED
    });

    var check = Titanium.UI.createButton({
        id: 'check',
        title: 'Login',
        color: '#000'
    });

    check.addEventListener('click', function() {
        TT.log('Check clicked: ' + flogin.value + ' :: ' + fpasswd.value);
        fpasswd.blur();
        flogin.blur();
        checkCreds(flogin.value, fpasswd.value);
    });
}
