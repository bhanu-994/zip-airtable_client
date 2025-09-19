import React, { useState, useEffect } from "react";
import { parseCSV, buildCSV } from "./utils/csvUtils";
import { 
  Upload, 
  FileText, 
  Download, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Database,
  Zap,
  Users,
  MapPin
} from "lucide-react";

function App() {
  const [masterData, setMasterData] = useState(null);
  const [workData, setWorkData] = useState(null);
  const [zipData, setZipData] = useState(null);
  const [updatedMasterCSV, setUpdatedMasterCSV] = useState("");
  const [updatedZipCSV, setUpdatedZipCSV] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

//   fetch("http://localhost:5000/api/file1")
//   .then(res => res.text())
//   .then(csv => {
//     console.log("File 1 CSV:", csv);
//   });

// fetch("http://localhost:5000/api/file2")
//   .then(res => res.text())
//   .then(csv => {
//     console.log("File 2 CSV:", csv);
//   });

   useEffect(() => {
    // file1 -> masterData
    fetch("http://localhost:5000/api/file1")
      .then(res => res.text())
      .then(csv => {
        const parsed = parseCSV(csv); // using your existing parser
        setMasterData(parsed);
      });

    // file2 -> zipData
    fetch("http://localhost:5000/api/file2")
      .then(res => res.text())
      .then(csv => {
        const parsed = parseCSV(csv);
        setZipData(parsed);
      });
  }, []);

  // Upload Master / Work / Zip files
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);

      if (type === "master") {
        setMasterData(parsed);
      } else if (type === "work") {
        setWorkData(parsed);
      } else if (type === "zip") {
        setZipData(parsed);
      }
    };
    reader.readAsText(file);
  };

  // Pick first available ZIP < 30000 population
  const pickAvailableZip = (zipRows) => {
    for (let zipEntry of zipRows) {
      const population = parseInt(zipEntry.population || "0", 10);
      if (population < 30000) {
        zipEntry.population = (population + 1).toString();
        return zipEntry.zip;
      }
    }
    return ""; // fallback if none available
  };

  // Process files and merge logic
  const processFiles = async () => {
    if (!masterData || !workData || !zipData) {
      alert("Please upload all three files: Master, Work, and uszips!");
      return;
    }

    setProcessing(true);
    setProcessedCount(0);

    // Simulate processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 1: Merge Work → Master on mdn
    const updatedZipRows = [...zipData.rows]; // clone uszips
    const mergedRows = masterData.rows.map((masterRow, index) => {
      const match = workData.rows.find(workRow => workRow["mdn"] === masterRow["mdn"]);
      if (match) {
        // mark row as modified
        const modifiedRow = {
          ...masterRow,
          icc: match["ICC-req"] || masterRow.icc,
          cus_name: match["cust-name"] || masterRow.cus_name,
          _modified: true
        };
        setProcessedCount(index + 1);
        return modifiedRow;
      }
      return { ...masterRow, _modified: false };
    });

    // Step 2: Only replace zip for modified rows
    const updatedMasterRows = mergedRows.map(row => {
      if (row._modified) {
        const newZip = pickAvailableZip(updatedZipRows);
        return { ...row, zip: newZip };
      }
      return row;
    });

    // Remove helper field
    const finalMasterRows = updatedMasterRows.map(({ _modified, ...rest }) => rest);

    // Build updated Master CSV (icc, cus_name, mdn, zip)
    const masterHeaders = ["icc", "cus_name", "mdn", "zip"];
    const updatedMasterContent = buildCSV(masterHeaders, finalMasterRows, ",");
    setUpdatedMasterCSV(updatedMasterContent);

    // Build updated uszips.csv (zip, population)
    const zipHeaders = ["zip", "population"];
    const updatedZipContent = buildCSV(zipHeaders, updatedZipRows, ",");
    setUpdatedZipCSV(updatedZipContent);

    setProcessing(false);
  };

  // Download helper
  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const FileUploadCard = ({ type, data, onUpload, icon: Icon, title, description, color }) => (
    <div className={`bg-white rounded-xl shadow-lg border-2 border-gray-100 hover:border-${color}-200 transition-all duration-300 p-6`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      
      <div className="relative">
        <input
          type="file"
          accept=".csv,.tsv"
          onChange={onUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className={`border-2 border-dashed border-gray-300 hover:border-${color}-400 rounded-lg p-8 text-center transition-colors duration-300`}>
          {data ? (
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">File loaded ({data.rows.length} rows)</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-xs mt-1">CSV or TSV files only</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Database className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">CSV Data Processor</h1>
                <p className="text-gray-600">Professional data merge and ZIP assignment tool</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Fast Processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>CSV Compatible</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload Section */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Files</h2>
            <p className="text-gray-600">Upload all three required files to begin processing</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FileUploadCard
              type="master"
              data={masterData}
              onUpload={(e) => handleFileUpload(e, "master")}
              icon={Users}
              title="Master File"
              description="Primary customer data"
              color="blue"
            />
            <FileUploadCard
              type="work"
              data={workData}
              onUpload={(e) => handleFileUpload(e, "work")}
              icon={FileText}
              title="Work File"
              description="Update requirements"
              color="green"
            />
            <FileUploadCard
              type="zip"
              data={zipData}
              onUpload={(e) => handleFileUpload(e, "zip")}
              icon={MapPin}
              title="ZIP Codes"
              description="uszips.csv data"
              color="purple"
            />
          </div>
        </div>

        {/* Status and Process Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Processing Status</h3>
            
            {/* Status Indicators */}
            <div className="flex justify-center space-x-8 mb-8">
              {[
                { name: "Master", data: masterData, color: "blue" },
                { name: "Work", data: workData, color: "green" },
                { name: "ZIP", data: zipData, color: "purple" }
              ].map(({ name, data, color }) => (
                <div key={name} className="flex items-center space-x-2">
                  {data ? (
                    <CheckCircle className={`w-5 h-5 text-${color}-500`} />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={data ? `text-${color}-600 font-medium` : "text-gray-400"}>
                    {name} File
                  </span>
                </div>
              ))}
            </div>

            {/* Process Button */}
            <button
              onClick={processFiles}
              disabled={!masterData || !workData || !zipData || processing}
              className={`inline-flex items-center space-x-3 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 ${
                !masterData || !workData || !zipData || processing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              }`}
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Process Files</span>
                </>
              )}
            </button>

            {processing && (
              <div className="mt-6">
                <p className="text-gray-600 mb-2">Processing records: {processedCount}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: masterData ? `${(processedCount / masterData.rows.length) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Download Section */}
        {(updatedMasterCSV || updatedZipCSV) && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Download Results</h3>
              <p className="text-gray-600">Your processed files are ready for download</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {updatedMasterCSV && (
                <button
                  onClick={() => downloadFile(updatedMasterCSV, "updated_masterFile.csv")}
                  className="inline-flex items-center space-x-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors duration-300 shadow-md hover:shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Master File</span>
                </button>
              )}

              {updatedZipCSV && (
                <button
                  onClick={() => downloadFile(updatedZipCSV, "updated_uszips.csv")}
                  className="inline-flex items-center space-x-3 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors duration-300 shadow-md hover:shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  <span>Download ZIP File</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600">
            <p>© 2025 CSV Data Processor. Professional data management tool.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;