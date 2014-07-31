if (true) {
} else {
    doSomething();
    Dialog.alert({
        title: '提示',content: args.content,type: 'success'
    }).on('ok', function () {
        doSomething();
        /*var urls = {
         pid:querys.pid,
         uid:querys.id
         };

         var url = buildUrl('idea/list', urls.uid, 'idea', {'pid':urls.pid});
         locator.redirect(url);*/
        //accountTree.refresh(0, 'user', true);
    });
}

