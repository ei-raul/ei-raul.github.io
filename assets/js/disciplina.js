document.querySelectorAll('.video-facade').forEach(function(el) {
  el.addEventListener('click', function() {
    var iframe = document.createElement('iframe');
    iframe.src = this.dataset.embed;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    iframe.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;height:100%;border:0');
    this.replaceWith(iframe);
  }, { once: true });
});
