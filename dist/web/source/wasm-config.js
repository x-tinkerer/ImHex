// Monkeypatch WebAssembly to have a progress bar
// inspired from: https://github.com/WordPress/wordpress-playground/pull/46 (but had to be modified)
function monkeyPatch(progressFun) {
    const _instantiateStreaming = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming = (response, ...args) => {
        const file = response.url.substring(
            new URL(response.url).origin.length + 1
        );
        const reportingResponse = new Response(
            new ReadableStream({
                async start(controller) {
                    const contentLength = response.headers.get("content-length");
                    const total = parseInt(contentLength, 10);
                    const reader = response.clone().body.getReader();
                    let loaded = 0;
                    for (; ;) {
                        const { done, value } = await reader.read();
                        if (done) {
                            progressFun(file, total, total);
                            break;
                        }
                        loaded += value.byteLength;
                        progressFun(file, loaded, total);
                        controller.enqueue(value);
                    }
                    controller.close();
                }
            },
                {
                    status: response.status,
                    statusText: response.statusText
                }
            )
        );
        for (const pair of response.headers.entries()) {
            reportingResponse.headers.set(pair[0], pair[1]);
        }

        return _instantiateStreaming(reportingResponse, ...args);
    }
}
monkeyPatch((file, done, total) => {
    let percent = ((done/total)*100).toFixed(2);
    let mib = (done/1024**2).toFixed(2);
    document.getElementById("progress").innerHTML = `Downloading: ${percent}% (${mib}MiB)`;
});

function glfwSetCursorCustom(wnd, shape) {
    let body = document.getElementsByTagName("body")[0]
    switch (shape) {
        case 0x00036001: // GLFW_ARROW_CURSOR
            body.style.cursor = "default";
            break;
        case 0x00036002: // GLFW_IBEAM_CURSOR
            body.style.cursor = "text";
            break;
        case 0x00036003: // GLFW_CROSSHAIR_CURSOR
            body.style.cursor = "crosshair";
            break;
        case 0x00036004: // GLFW_HAND_CURSOR
            body.style.cursor = "pointer";
            break;
        case 0x00036005: // GLFW_HRESIZE_CURSOR
            body.style.cursor = "ew-resize";
            break;
        case 0x00036006: // GLFW_VRESIZE_CURSOR
            body.style.cursor = "ns-resize";
            break;
        default:
            body.style.cursor = "default";
            break;
    }

}

function glfwCreateStandardCursorCustom(shape) {
    return shape
}

var notWorkingTimer = setTimeout(() => {
    document.getElementById("not_working").classList.add("visible")
}, 5000);

var Module = {
    preRun:  [],
    postRun: [],
    onRuntimeInitialized: function() {
        // Triggered when the wasm module is loaded and ready to use.
        document.getElementById("loading").style.display = "none"
        document.getElementById("canvas").style.display = "initial"

        clearTimeout(notWorkingTimer);
    },
    print:   (function() { })(),
    printErr: function(text) {  },
    canvas: (function() {
        let canvas = document.getElementById('canvas');
        // As a default initial behavior, pop up an alert when webgl context is lost. To make your
        // application robust, you may want to override this behavior before shipping!
        // See http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
        canvas.addEventListener("webglcontextlost", function(e) { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);

        return canvas;
    })(),
    setStatus: function(text) { },
    totalDependencies: 0,
    monitorRunDependencies: function(left) {
    },
    instantiateWasm: function(imports, successCallback) {
        imports.env.glfwSetCursor = glfwSetCursorCustom
        imports.env.glfwCreateStandardCursor = glfwCreateStandardCursorCustom
        instantiateAsync(wasmBinary, wasmBinaryFile, imports, (result) => {
            successCallback(result.instance, result.module)
        });
    }
};


window.addEventListener('resize', js_resizeCanvas, false);
function js_resizeCanvas() {
    let canvas = document.getElementById('canvas');
    canvas.width  = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    canvas.height = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);

    canvas.classList.add("canvas_full_screen")

    if (GLFW.active && GLFW.active.windowPosFunc) {
        getWasmTableEntry(GLFW.active.windowPosFunc)(GLFW.active.id, GLFW.active.x, GLFW.active.y);
    }

    GLFW.onWindowSizeChanged();
}