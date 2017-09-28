function Earth(options) {
    width = options.width;
    height = options.height;
    radius = options.radius || 0.5;
    segmentsWidth = options.segmentsWidth || 32;
    segmentsHeight = options.segmentsHeight || 32;
    fps = options.fps || 25

    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        shadowMapEnabled: true
    });

    renderer.setSize(width, height);

    console.log(fps);
    var updateFcts = [];
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
    camera.position.z = 2.5;

    var light = new THREE.AmbientLight(0x888888)
    scene.add(light)

    var light = new THREE.DirectionalLight(0xcccccc, 1)
    light.position.set(5, 5, 5)
    scene.add(light)

    /* Make earth mesh */
    var geometry = new THREE.SphereGeometry(0.5, 60, 60)
    var material = new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture('images/earthmap1k.jpg'),
        bumpMap: THREE.ImageUtils.loadTexture('images/earthbump1k.jpg'),
        bumpScale: 0.1,
        specularMap: THREE.ImageUtils.loadTexture('images/earthspec1k.jpg'),
        specular: new THREE.Color('gray'),
    })

    var earthMesh = new THREE.Mesh(geometry, material);
    scene.add(earthMesh)

    /* ------------------------------ */
    /* Make earth cloud mesh */
    var canvasResult = makeClounTexture();

    var geometry = new THREE.SphereGeometry(0.53, 60, 60)
    var material = new THREE.MeshPhongMaterial({
        map: new THREE.Texture(canvasResult),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
    })
    var mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    /* ------------------------------ */

    updateFcts.push(
        function (delta, now) {
            mesh.rotation.y += 1 / 4 * delta;
        },
        function () {
            renderer.render(scene, camera);
        },
        function (delta, now) {
            earthMesh.rotation.y += 1 / 8 * delta;

            if (parseInt(earthMesh.rotation.y * 10) % 63 == 0) {
                console.log("round again !");
                console.log(earthMesh.rotation.y);

                earthMesh.rotation.y = 0.1;

                makeImgTexture("images/bx.png", 0.35, 0.8)
                makeImgTexture("images/mg.png", 0, 0.8)
                makeImgTexture("images/bx.png", 0, -0.8)
                makeImgTexture("images/mg.png", 0.35, -0.8)
                makeImgTexture("images/bx.png", -0.35, 0.8)
                makeImgTexture("images/mg.png", -0.35, -0.8)
            }
            // console.log(earthMesh.rotation);

        }
    )

    window.earthMesh = earthMesh;

    var lastTimeMsec = null
    requestAnimationFrame(function animate(nowMsec) {
        // keep looping
        requestAnimationFrame(animate);
        // measure time
        lastTimeMsec = lastTimeMsec || nowMsec - 1000 / fps
        var deltaMsec = Math.min(200, nowMsec - lastTimeMsec)
        lastTimeMsec = nowMsec
        // call each update function
        updateFcts.forEach(function (updateFn) {
            updateFn(deltaMsec / 1000, nowMsec / 1000)
        })
    })

    function makeImgTexture(image, x, y) {
        var img_texture = THREE.ImageUtils.loadTexture(image, null, function (t) {
        });
        var img_material = new THREE.MeshBasicMaterial({ map: img_texture });
        var img_geometry = new THREE.PlaneGeometry(0.25, 0.25, 1, 1);
        img_geometry.vertices[0].uv = new THREE.Vector2(2, 2);
        img_geometry.vertices[1].uv = new THREE.Vector2(4, 2);
        img_geometry.vertices[2].uv = new THREE.Vector2(4, 4);
        img_geometry.vertices[3].uv = new THREE.Vector2(2, 4);

        var img_mesh = new THREE.Mesh(img_geometry, img_material);

        window.img_mesh = img_mesh;
        img_mesh.position.x = x;
        img_mesh.position.y = y;
        console.log(img_mesh.position)
        scene.add(img_mesh);

    }

    function makeClounTexture() {
        var canvasResult = document.createElement('canvas')
        canvasResult.width = 1024
        canvasResult.height = 512
        var contextResult = canvasResult.getContext('2d')

        // load earthcloudmap
        var imageMap = new Image();
        imageMap.addEventListener("load", function () {

            // create dataMap ImageData for earthcloudmap
            var canvasMap = document.createElement('canvas')
            canvasMap.width = imageMap.width
            canvasMap.height = imageMap.height
            var contextMap = canvasMap.getContext('2d')
            contextMap.drawImage(imageMap, 0, 0)
            var dataMap = contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height)

            // load earthcloudmaptrans
            var imageTrans = new Image();
            imageTrans.addEventListener("load", function () {
                // create dataTrans ImageData for earthcloudmaptrans
                var canvasTrans = document.createElement('canvas')
                canvasTrans.width = imageTrans.width
                canvasTrans.height = imageTrans.height
                var contextTrans = canvasTrans.getContext('2d')
                contextTrans.drawImage(imageTrans, 0, 0)
                var dataTrans = contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height)
                // merge dataMap + dataTrans into dataResult
                var dataResult = contextMap.createImageData(canvasMap.width, canvasMap.height)
                for (var y = 0, offset = 0; y < imageMap.height; y++) {
                    for (var x = 0; x < imageMap.width; x++ , offset += 4) {
                        dataResult.data[offset + 0] = dataMap.data[offset + 0]
                        dataResult.data[offset + 1] = dataMap.data[offset + 1]
                        dataResult.data[offset + 2] = dataMap.data[offset + 2]
                        dataResult.data[offset + 3] = 255 - dataTrans.data[offset + 0]
                    }
                }
                // update texture with result
                contextResult.putImageData(dataResult, 0, 0)
                material.map.needsUpdate = true;
            })
            imageTrans.src = 'images/earthcloudmaptrans.jpg';
        }, false);
        imageMap.src = 'images/earthcloudmap.jpg';


        return canvasResult;
    }

    return {
        canvas: renderer.domElement,
        renderer: renderer,
        onDocumentMouseDown: function (event) {
            event.preventDefault();
            var vector = new THREE.Vector3();
            vector.set(
                (event.clientX / width) * 2 - 1,
                - (event.clientY / height) * 2 + 1,
                0.5);

            console.log(vector);
            vector.projectOnPlane(camera);
            var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
            var intersects = raycaster.intersectObjects(scene.children);
            if (intersects.length > 0) {
                var selected = intersects[0];
                console.log("x:" + selected.point.x);
                console.log("y:" + selected.point.y);
                console.log("z:" + selected.point.z);
            }
        }
    };
}