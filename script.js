// Main application
document.addEventListener('DOMContentLoaded', function() {
    // Scene setup
    const container = document.getElementById('eye-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Eye model data
    const eyeParts = [
        { name: "Cornea", color: 0x88ccff, opacity: 0.7, position: [0, 0, 1.5], size: [1.2, 1.2, 0.1], description: "The transparent front part of the eye that covers the iris, pupil, and anterior chamber. It refracts light." },
        { name: "Iris", color: 0x5e3c1a, position: [0, 0, 1.4], size: [0.8, 0.8, 0.05], description: "The colored part of the eye that controls the size of the pupil and thus the amount of light reaching the retina." },
        { name: "Pupil", color: 0x000000, position: [0, 0, 1.35], size: [0.3, 0.3, 0.1], description: "The black circular opening in the center of the iris that allows light to enter the eye." },
        { name: "Lens", color: 0xffffff, opacity: 0.8, position: [0, 0, 0.8], size: [0.6, 0.6, 0.3], description: "A transparent, biconvex structure that helps to refract light to be focused on the retina." },
        { name: "Retina", color: 0xff9999, opacity: 0.6, position: [0, 0, -1], size: [2, 2, 0.2], spherical: true, description: "The light-sensitive layer of tissue at the back of the eye that converts light into neural signals." },
        { name: "Optic Nerve", color: 0xcccccc, position: [-0.5, 0.2, -1.5], size: [0.3, 0.3, 1.5], description: "Transmits visual information from the retina to the brain." },
        { name: "Sclera", color: 0xffffff, position: [0, 0, 0], size: [2, 2, 2], spherical: true, description: "The white outer layer of the eyeball that provides protection and form." },
        { name: "Vitreous Humor", color: 0xddffdd, opacity: 0.3, position: [0, 0, 0], size: [1.8, 1.8, 1.8], spherical: true, description: "The clear gel that fills the space between the lens and the retina, maintaining the eye's shape." },
        { name: "Ciliary Body", color: 0xaa88ff, position: [0, 0, 1], size: [1.5, 1.5, 0.3], spherical: true, description: "Contains the ciliary muscle that controls the shape of the lens for focusing." },
        { name: "Choroid", color: 0x553388, position: [0, 0, -0.5], size: [1.9, 1.9, 0.3], spherical: true, description: "A vascular layer containing connective tissue that provides oxygen and nourishment to the outer retina." }
    ];
    
    // Create eye parts
    const partObjects = [];
    const labelElements = [];
    
    eyeParts.forEach(part => {
        let geometry;
        if (part.spherical) {
            geometry = new THREE.SphereGeometry(part.size[0], 32, 32);
        } else {
            geometry = new THREE.BoxGeometry(...part.size);
        }
        
        const material = new THREE.MeshPhongMaterial({ 
            color: part.color,
            transparent: part.opacity !== undefined,
            opacity: part.opacity || 1,
            side: part.spherical ? THREE.BackSide : THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...part.position);
        mesh.name = part.name;
        mesh.userData.description = part.description;
        scene.add(mesh);
        partObjects.push(mesh);
        
        // Create HTML label
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = part.name;
        label.style.display = 'none';
        container.appendChild(label);
        labelElements.push({ label, part: mesh });
    });
    
    // Populate parts list
    const partsList = document.getElementById('parts-list');
    eyeParts.forEach(part => {
        const li = document.createElement('li');
        li.textContent = part.name;
        li.addEventListener('click', () => {
            highlightPart(part.name);
            showPartInfo(part.name, part.description);
        });
        partsList.appendChild(li);
    });
    
    // Highlight part when clicked
    let highlightedPart = null;
    let highlightMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00, 
        transparent: true, 
        opacity: 0.5 
    });
    
    function highlightPart(partName) {
        // Remove previous highlight
        if (highlightedPart) {
            highlightedPart.material = highlightedPart.userData.originalMaterial;
        }
        
        // Find and highlight new part
        const part = partObjects.find(p => p.name === partName);
        if (part) {
            part.userData.originalMaterial = part.material;
            part.material = highlightMaterial;
            highlightedPart = part;
            
            // Center camera on the part
            controls.target.copy(part.position);
            camera.position.copy(part.position.clone().add(new THREE.Vector3(2, 2, 2)));
        }
    }
    
    // Show part info
    function showPartInfo(partName, description) {
        document.getElementById('part-title').textContent = partName;
        document.getElementById('part-description').innerHTML = `<p>${description}</p>`;
    }
    
    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    function onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / container.clientWidth) * 2 - 1;
        mouse.y = - (event.clientY / container.clientHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(partObjects);
        
        // Update labels
        updateLabels();
        
        if (intersects.length > 0) {
            const firstIntersected = intersects[0].object;
            
            // Show label for the first intersected object
            const labelInfo = labelElements.find(l => l.part === firstIntersected);
            if (labelInfo) {
                const vector = new THREE.Vector3();
                vector.setFromMatrixPosition(firstIntersected.matrixWorld);
                vector.project(camera);
                
                const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
                const y = (vector.y * -0.5 + 0.5) * container.clientHeight;
                
                labelInfo.label.style.display = 'block';
                labelInfo.label.style.left = `${x}px`;
                labelInfo.label.style.top = `${y}px`;
            }
        }
    }
    
    function onClick(event) {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / container.clientWidth) * 2 - 1;
        mouse.y = - (event.clientY / container.clientHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(partObjects);
        
        if (intersects.length > 0) {
            const firstIntersected = intersects[0].object;
            highlightPart(firstIntersected.name);
            showPartInfo(firstIntersected.name, firstIntersected.userData.description);
        }
    }
    
    function updateLabels() {
        // Hide all labels first
        labelElements.forEach(l => {
            l.label.style.display = 'none';
        });
        
        // Update positions for visible parts
        partObjects.forEach(part => {
            const partPosition = new THREE.Vector3();
            partPosition.setFromMatrixPosition(part.matrixWorld);
            
            // Check if the part is in front of the camera
            const position = partPosition.clone().project(camera);
            if (position.z > -1) {
                const labelInfo = labelElements.find(l => l.part === part);
                if (labelInfo) {
                    const x = (position.x * 0.5 + 0.5) * container.clientWidth;
                    const y = (position.y * -0.5 + 0.5) * container.clientHeight;
                    
                    labelInfo.label.style.display = 'block';
                    labelInfo.label.style.left = `${x}px`;
                    labelInfo.label.style.top = `${y}px`;
                }
            }
        });
    }
    
    // Event listeners
    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('click', onClick, false);
    
    // Control buttons
    document.getElementById('reset-view').addEventListener('click', () => {
        controls.reset();
        camera.position.z = 5;
        controls.target.set(0, 0, 0);
        highlightedPart = null;
        partObjects.forEach(part => {
            if (part.userData.originalMaterial) {
                part.material = part.userData.originalMaterial;
            }
        });
        document.getElementById('part-title').textContent = 'Eye Anatomy';
        document.getElementById('part-description').innerHTML = `
            <p>Click on any part of the eye to learn about its structure and function.</p>
            <div class="eye-diagram">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Schematic_diagram_of_the_human_eye_en.svg/1200px-Schematic_diagram_of_the_human_eye_en.svg.png" alt="Eye Diagram">
            </div>
        `;
    });
    
    let labelsVisible = true;
    document.getElementById('toggle-labels').addEventListener('click', () => {
        labelsVisible = !labelsVisible;
        labelElements.forEach(l => {
            l.label.style.display = labelsVisible ? 'block' : 'none';
        });
    });
    
    document.getElementById('view-presets').addEventListener('change', (e) => {
        switch(e.target.value) {
            case 'front':
                camera.position.set(0, 0, 5);
                controls.target.set(0, 0, 0);
                break;
            case 'side':
                camera.position.set(5, 0, 0);
                controls.target.set(0, 0, 0);
                break;
            case 'cross-section':
                camera.position.set(2, 0, 0);
                controls.target.set(0, 0, 0);
                break;
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    animate();
});