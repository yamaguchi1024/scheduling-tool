const fontsmall = "12px";
const fontbig = "14px";
let image_width = 2560;
let image_height = 1600;
let segment_x = 510; // 1150

let snap;
let y_loc = [];

function draw(segments) {
    snap = Snap("#svg");
    snap.clear();
    y_loc = [];

    let widths = [image_width];
    let heights = [image_height];
    let y0 = 20;
    let outlets = [];

    for (let i = 0; i < segments.length; i++){

        let parent = segments[i][0];
        let x_range = segments[i][1];
        let y_range = segments[i][2];

        let width = widths[parent+1];
        let height = heights[parent+1];

        // When kernel
        if (y_range == -1) {
            width = 8;
            height = 1;
            y_range = 1;
        }

        let box_width = (1 + 0.5*Math.log(width)) * 140 / 2.5;
        let box_height = (1 + 0.5* Math.log(height)) * 40 / 2.5;

        let parent_outlet = null;
        if (parent != -1) 
            parent_outlet = outlets[parent];

        draw_segment(snap, segment_x, y0, box_width, box_height,
            x_range, y_range, width, height, parent_outlet,
            segments[i][3], segments[i][4], outlets, i, segments[i][5]);

        y0 = y0 + box_height + 42;

        widths.push(Math.ceil(width / x_range));
        heights.push(Math.ceil(height / y_range));
    }


}

function draw_segment(snap, x_offset, y_offset, width, height,
                x_range, y_range, data_width, data_height, parent_outlet,
                                    label, funcname, outlets, segnum, schedule_line) {
    x_offset = x_offset - width;

    let x0 = x_offset;
    let x1 = x_offset+width;
    let y0 = y_offset;
    let y1 = y_offset + height;
    let dx = height * 2;	

    document.getElementById("svg").setAttribute("height",
        Math.max(parseInt(document.getElementById("svg").getAttribute("height")), y1 + 50));
    draw_subbox(snap, x0, x1, y0, y1, dx, "#FFFFFF", "#000000");
    if (parent_outlet != null) {
        const color = "#FF0000"; //globalcolortable[funcname];
        snap.line(parent_outlet[0], parent_outlet[1], parent_outlet[0], (y0 + y1) / 2).attr({ fill: "none", stroke: color });
        draw_arrow(parent_outlet[0], (y0 + y1) / 2, x0 - dx/2-30, (y0 + y1) / 2, color);
    }

    let next_data_width =  Math.ceil(data_width / x_range);
    let next_data_height =  Math.ceil(data_height / y_range);

    let x_label =  '0..' + (x_range-1);
    let y_label = '0..' + (y_range-1);

    snap.text( (x0 + x1)/2-20, y0-6, x_label).attr({fontSize: fontsmall});
    snap.text(x1-dx/2, y0 + height / 2 +20 , y_label).attr({fontSize: fontsmall});

    if (y_range > height/4)
        y_range = height/4;

    if (x_range > width/4)
        x_range = width/4;
    for (let y = 0; y<y_range; y++){
        for (let x = 0; x < x_range; x++) {
            let _x0 = x0 + width * x / x_range - dx * y / y_range;
            let _x1 = x0 + width * (x+1) / x_range  - dx * y / y_range;
            let _y0 = y0 + height * y / y_range;
            let _y1 = y0 + height * (y+1) / y_range;
            let _dx = dx / y_range;
            let fill_color = "#FFFFFF"
            let stroke_color = "#000000"
            if (x == 0 && y == Math.ceil(y_range-1)) {
                fill_color = globalcolortable[funcname];
                stroke_color = globalcolortable[funcname];
                snap.text( _x0- _dx, _y1+15, ""+next_data_width+"x"+next_data_height).attr(
                    {fontSize: fontsmall, fill: globalcolortable[funcname], fontWeight: "bold"});
                outlets.push([_x0 -_dx -30, _y1+10]);

                snap.text( _x0-_dx-20, _y1+15, "#" + segnum).attr(
                    {fontSize: fontsmall, fill: globalcolortable[funcname], fontWeight: "bold"});
                snap.text( _x0-_dx-20, _y1+26, funcname).attr(
                    {fontSize: fontsmall, fill: globalcolortable[funcname], fontWeight: "bold"});
            }
            draw_subbox(snap, _x0, _x1, _y0, _y1, _dx, fill_color, stroke_color);
        }
    };

    let d = 1;
    snap.text( (x0 + x1)/2-dx/2-35+d, (y0+y1)/2+5+d, label).attr({fontWeight:"bold",fontSize:fontbig,fill:"#FFFFFF",});
    snap.text( (x0 + x1)/2-dx/2-35-d, (y0+y1)/2+5+d, label).attr({fontWeight:"bold",fontSize:fontbig,fill:"#FFFFFF",});
    snap.text( (x0 + x1)/2-dx/2-35-d, (y0+y1)/2+5-d, label).attr({fontWeight:"bold",fontSize:fontbig,fill:"#FFFFFF",});
    snap.text( (x0 + x1)/2-dx/2-35+d, (y0+y1)/2+5-d, label).attr({fontWeight:"bold",fontSize:fontbig,fill:"#FFFFFF",});
    snap.text( (x0 + x1)/2-dx/2-35, (y0+y1)/2+5, label).attr({fontWeight:"bold",fontSize:fontbig,fill:"#000000",});

    // Draw dash line for each schedule
    const line_y = y1 + 17;
    const line_x = x0 + 60;
    snap.line(line_x, line_y, 850, line_y).attr({ fill: "none", stroke: "black", 'stroke-dasharray': "8"});

    const sched_y = line_y - 32;
    const sched_x = 600;
    // Draw schedule text
    for (const idx in schedule_line) {
        let line = schedule_line[idx];
        let fname = line.match(/[?].*[?]/);
        if (fname != null) {
            line = line.replace(fname,'');
        }

        const space = (line.match(/&nbsp;/g) || []).length;
        snap.text(sched_x + space*6, sched_y + 14*idx, line.replace(/&nbsp;/g,"")).attr({fontSize: fontsmall});
    }

    y_loc.push(line_y);
};

function draw_button_cost(linenum, line_cost, load_cost, store_cost, compute_cost) {
    if (snap == undefined) return;

    // Draw scheduling button
    const x = 860;
    const y = y_loc[linenum];
    let button = snap.polygon(x, y, x+10, y+10, x+10, y+3, x+20, y+3, x+20, y-3, x+10, y-3, x+10, y-10);
    button     = button.attr({ text: linenum, id : "button", fill: "red"});

    button.mouseover( function(e) {
            e.target.setAttribute("fill", "#FFEF00");
    });

    button.click( function() {
            globalexec.stdin.write(linenum + " -1\n");
            document.getElementById("input").disabled = false;
    });

    button.mouseout( function(e) {
            e.target.setAttribute("fill", "red");
    });

    // Draw cost
    snap.text(x+30, y + 4, "Cost: " + line_cost).attr({fontSize: fontbig});
    snap.text(x+100, y + 2, "Load cost: " + load_cost).attr({fontSize: fontsmall});
    snap.text(x+100, y + 16, "Store cost: " + store_cost).attr({fontSize: fontsmall});
    snap.text(x+100, y + 30, "Compute cost: " + compute_cost).attr({fontSize: fontsmall});
};

function draw_subbox(snap, x0, x1, y0, y1, dx, fill_color, stroke_color) {
    let points = [x0, y0, x1, y0, x1 - dx, y1, x0 - dx, y1];
    snap.polygon(points).attr({ fill: fill_color, stroke: stroke_color});
}

function draw_arrow(x0, y0, x1, y1, color) {
    let r = 10;
    snap.line(x0, y0, x1, y1).attr({ fill: "none", stroke: color });
    snap.line(x1-r, y1-r, x1, y1).attr({ fill: "none", stroke: color });
    snap.line(x1-r, y1+r, x1, y1).attr({ fill: "none", stroke: color });
}
