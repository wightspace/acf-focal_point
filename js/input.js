(function ($) {

	function inPercent(value, total) {
		return (value / total) * 100;
	}

	function inNumber(percent, total) {
		if (percent > 100) {
			throw Error("Invalid number, percent can't be more than 100");
		}
		return (percent / 100) * total;
	}

	// initialized on ACF events
	function initialize_field($el) {

		// Cache jquery selectors
		// Values to get/set
		var $id = $el.find('.acf-focal_point-id'),
			$top = $el.find('.acf-focal_point-top'),
			$left = $el.find('.acf-focal_point-left'),

			// Elements to get/set 
			$fp = $el.find('.acf-focal_point'),
			$img = $el.find('.acf-focal_point-image'),

			// Buttons to trigger events
			$add = $el.find('.add-image'),
			$del = $el.find('.acf-button-delete'),

			$dot = $el.find(".dot"),
			$previews = document.querySelectorAll("[class*='preview-'] img");

		// Hold/get our values
		var values = {
			id: $id.val(),
			top: $top.val(),
			left: $left.val(),
			size: $fp.data('preview_size')
		};

		// To hold WP media frame
		var file_frame;

		/**
		 * if any of the conditions are true, the position
		 * is outside the containment. As we want to know
		 * if the position is inside the container we
		 * reverse the result of the set of conditions.
		 */

		const makeFocalPoint = (initialPos = { x: 50, y: 50 }) => {
			let pos = initialPos;
			let img;

			const updateImage = () => {
				img = $img[0].getBoundingClientRect();
			};

			const updatePosition = (e) => {
				const x = Math.round(inPercent(e.clientX - img.x, img.width));
				const y = Math.round(inPercent(e.clientY - img.y, img.height));

				if (x <= 0) {
					pos.x = 0;
				} else if (x >= 100) {
					pos.x = 100;
				} else {
					pos.x = x;
				}

				if (y <= 0) {
					pos.y = 0;
				} else if (y >= 100) {
					pos.y = 100;
				} else {
					pos.y = y;
				}

				$top.val(`${pos.y}`);
				$left.val(`${pos.x}`);
			};

			const updateDot = (initialCoords = null) => {
				if (initialCoords && initialCoords.id > 0) {
					$dot[0].style.left = inNumber(initialCoords.left, img.width) - $dot[0].offsetWidth / 2 + "px";
					$dot[0].style.top = inNumber(initialCoords.top, img.height) - $dot[0].offsetHeight / 2 + "px";
				} else {
					$dot[0].style.left = inNumber(pos.x, img.width) - $dot[0].offsetWidth / 2 + "px";
					$dot[0].style.top = inNumber(pos.y, img.height) - $dot[0].offsetHeight / 2 + "px";
				}
			};

			const updatePreviews = (initialCoords = null) => {
				$previews.forEach((preview) => {
					if (initialCoords && initialCoords.id > 0) {
						preview.style.objectPosition = `${initialCoords.left}% ${initialCoords.top}%`;
					} else {
						preview.style.objectPosition = `${pos.x}% ${pos.y}%`;
					}
				});
			};

			const handleImageDown = (e) => {
				updateImage();
				updatePosition(e);
				updateDot();
				updatePreviews();
			};

			const init = (initialCoords) => {
				window.addEventListener("resize", handleImageDown);

				$img.click(function (e) {
					handleImageDown(e);
				});

				updateImage();
				updateDot(initialCoords);
				updatePreviews(initialCoords);
			};

			init(values);
		};

		$img.one("load", function () {
			makeFocalPoint();
		})

		$dot.dblclick(function () {
			$previews.forEach((preview) => {
				$(preview).toggle();
			});
		});

		// When we click the add image button...
		$add.on('click', function () {

			console.log('click');

			// If the media frame already exists, reopen it.
			if (file_frame) {
				file_frame.open();
				return;
			}

			// Create the media frame.
			file_frame = wp.media.frames.file_frame = wp.media({
				title: 'Select Image',
				button: { text: 'Select' }
			});

			// When an image is selected..
			file_frame.on('select', function () {

				// Get selected image objects
				var attachment = file_frame.state().get('selection').first().toJSON(),
					src = attachment.sizes[values.size];

				// Make UI active (hide add image button, show canvas)
				$fp.addClass('active');

				if (src === undefined) {
					src = attachment;
				}

				// Set image to new src, triggering on load
				$img.attr('src', src.url);

				$previews.forEach((preview) => {
					preview.src = src.url;
				});

				// Update our post values and values obj
				$id.val(attachment.id);
				values.id = attachment.id;

			});

			// Finally, open the modal
			file_frame.open();
		});


		// When we click the delete image button...
		$del.on('click', function () {
			// Reset DOM image attributes
			$img.removeAttr('src width height');

			// Hide canvas and show add image button
			$fp.removeClass('active');

			// Reset our post values
			$id.val('');
			$top.val('');
			$left.val('');

			$previews.forEach((preview) => {
				preview.src = null;
			});

			// And our values obj, but just one value (to check later) will do.
			values.top = null;
		});

		// Make sure image is sized correctly after being unhidden
		$('.acf-tab-button').on('click', function () {

			// Needs a timeout of 0 for some reason.
			setTimeout(function () {
				drawCanvas();
			}, 0);
		});


	}


	if (typeof acf.add_action !== 'undefined') {

		/*
		*  ready append (ACF5)
		*
		*  These are 2 events which are fired during the page load
		*  ready = on page load similar to $(document).ready()
		*  append = on new DOM elements appended via repeater field
		*
		*  @type	event
		*  @date	20/07/13
		*
		*  @param	$el (jQuery selection) the jQuery element which contains the ACF fields
		*  @return	n/a
		*/

		acf.add_action('ready append', function ($el) {

			// search $el for fields of type 'focal_point'
			acf.get_fields({ type: 'focal_point' }, $el).each(function () {

				initialize_field($(this));

			});

		});


	} else {


		/*
		*  acf/setup_fields (ACF4)
		*
		*  This event is triggered when ACF adds any new elements to the DOM. 
		*
		*  @type	function
		*  @since	1.0.0
		*  @date	01/01/12
		*
		*  @param	event		e: an event object. This can be ignored
		*  @param	Element		postbox: An element which contains the new HTML
		*
		*  @return	n/a
		*/

		$(document).on('acf/setup_fields', function (e, postbox) {

			$(postbox).find('.field[data-field_type="focal_point"]').each(function () {

				initialize_field($(this));

			});

		});


	}


})(jQuery);
