import { PDFDocument } from 'https://cdn.jsdelivr.net/npm/pdf-lib@^1.17.0/dist/pdf-lib.esm.min.js';
//import JSZip from 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';

async function addSealToPDF ( pdfBytes, imageBytes, pdfFileName, copyNumber ) {
    const pdfDoc = await PDFDocument.load( pdfBytes );
    const pngImage = await pdfDoc.embedPng( imageBytes );
    const firstPage = pdfDoc.getPages()[ 0 ];

    const { width, height } = firstPage.getSize();

    let x, y;
    const sealWidth = 306;
    const sealHeight = 75;

    // Approximate sizes for A0, A1, A2, A3, A4, and custom A in points
    const sizes = {
        A0: { width: 2383.94, height: 3370.39 },
        A1: { width: 1683.78, height: 2383.94 },
        A2: { width: 1190.55, height: 1683.78 },
        A3: { width: 841.89, height: 1190.55 },
        A4: { width: 595.28, height: 841.89 },
        CustomA: { width: 3487, height: 2004 }, // Custom A size
    };

    // Tolerance for size comparison
    const tolerance = 1; // Adjust this value if needed

    // Check each size
    for ( const size in sizes ) {
        const { width: sizeWidth, height: sizeHeight } = sizes[ size ];
        if ( Math.abs( width - sizeWidth ) < tolerance && Math.abs( height - sizeHeight ) < tolerance ) {
            // Size Detected
            x = size === "A4" || size === "CustomA" ? width - 141 - sealWidth : width - 50 - sealWidth; // Adjust x coordinate for A4, CustomA, or other sizes
            y = size === "A4" || size === "CustomA" ? 690 : ( sizeHeight - sealHeight ) / 2; // Adjust y coordinate for A4, CustomA, or other sizes
            break; // Exit the loop once a size is detected
        }
    }

    firstPage.drawImage( pngImage, {
        x: x,
        y: y,
        width: sealWidth,
        height: sealHeight
    } );

    const modifiedPdfBytes = await pdfDoc.save();

    // Construct the new file name with copyNumber
    const fileNameParts = pdfFileName.split( '.' );
    const baseName = fileNameParts[ 0 ];
    const extension = fileNameParts[ 1 ];
    const newFileName = `${baseName}_${copyNumber}.${extension}`;

    return { filename: newFileName, data: modifiedPdfBytes };
};

function readFileAsArrayBuffer ( file ) {
    return new Promise( ( resolve, reject ) => {
        const reader = new FileReader();
        reader.onload = event => resolve( event.target.result );
        reader.onerror = error => reject( error );
        reader.readAsArrayBuffer( file );
    } );
}

document.addEventListener( 'DOMContentLoaded', () => {
    document.getElementById( 'processPDFButton' ).addEventListener( 'click', async () => {
        const pdfFiles = document.getElementById( 'pdfInput' ).files;
        const imageFiles = document.getElementById( 'imageInput' ).files;

        if ( pdfFiles.length === 0 || imageFiles.length === 0 ) {
            alert( "Por favor, seleccione al menos un archivo PDF y al menos un archivo de imagen de sello." );
            return;
        }

        // Create a new ZIP instance
        const zip = new JSZip();

        // Process each PDF file
        for ( let i = 0; i < pdfFiles.length; i++ ) {
            const pdfFile = pdfFiles[ i ];
            const pdfFileName = pdfFile.name;

            // Process each selected image (seal)
            for ( let j = 0; j < imageFiles.length; j++ ) {
                const imageFile = imageFiles[ j ];
                const imageFileName = imageFile.name;

                const pdfBytes = await readFileAsArrayBuffer( pdfFile );
                const imageBytes = await readFileAsArrayBuffer( imageFile );

                // Create a copy of the PDF file with the seal
                const { filename, data } = await addSealToPDF( pdfBytes, imageBytes, pdfFileName, j + 1 );

                // Add the sealed PDF to the ZIP file
                zip.file( `${filename}`, data );
            }
        }

        // Generate the ZIP file
        zip.generateAsync( { type: "blob" } ).then( function ( content ) {
            // Create a blob containing the ZIP content
            const zipBlob = new Blob( [ content ], { type: "application/zip" } );

            // Create a download link for the ZIP file
            const a = document.createElement( 'a' );
            a.href = URL.createObjectURL( zipBlob );
            a.download = "sealed_pdfs.zip"; // Set the ZIP file name
            a.style.display = 'none';

            // Add the link to the document and trigger the download
            document.body.appendChild( a );
            a.click();

            // Clean up
            document.body.removeChild( a );
        } );
    } );
} );
