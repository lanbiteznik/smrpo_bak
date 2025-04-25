"use client";
import React, { useEffect, useState } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  TooltipItem
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Define burndown data type
interface BurndownDataPoint {
  date: string;
  ideal: number;
  actual: number | null;
}

interface SprintBurndownProps {
  sprintId: number;
}

// Utility function for retrying failed fetch requests
const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {}, 
  retries = 3, 
  delay = 1000,
  backoff = 1.5
): Promise<Response> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retries <= 1) throw error;
    
    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    console.log(`Retrying fetch to ${url}, ${retries-1} retries left (next retry in ${delay * backoff}ms)`);
    return fetchWithRetry(url, options, retries - 1, delay * backoff, backoff);
  }
};

const SprintBurndown: React.FC<SprintBurndownProps> = ({ sprintId }) => {
  const [burndownData, setBurndownData] = useState<BurndownDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBurndownData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithRetry(`/api/sprint/${sprintId}/burndown`);
        const data = await res.json();
        
        if (data && Array.isArray(data)) {
          setBurndownData(data);
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          throw new Error("Invalid data format received");
        }
      } catch (err) {
        console.error("Error fetching burndown data:", err);
        setError(`Failed to load burndown chart data: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    if (sprintId) {
      fetchBurndownData();
    }
  }, [sprintId]);

  const chartData: ChartData<'line'> = {
    labels: burndownData.map(d => d.date),
    datasets: [
      {
        label: 'Ideal Burndown',
        data: burndownData.map(d => d.ideal),
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderDash: [5, 5],
        tension: 0.1
      },
      {
        label: 'Actual Burndown',
        data: burndownData.map(d => d.actual),
        fill: false,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Remaining Story Points'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(tooltipItem: TooltipItem<'line'>) {
            const datasetLabel = tooltipItem.dataset.label || '';
            const value = tooltipItem.raw !== null && tooltipItem.raw !== undefined ? tooltipItem.raw : 'No data';
            return `${datasetLabel}: ${value}`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Header>Sprint Burndown Chart</Card.Header>
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" className="my-3" />
          <p>Loading burndown chart data...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4">
        <Card.Header>Sprint Burndown Chart</Card.Header>
        <Card.Body>
          <Alert variant="danger">
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (burndownData.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>Sprint Burndown Chart</Card.Header>
        <Card.Body>
          <Alert variant="info">
            No burndown data available for this sprint.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header>Sprint Burndown Chart</Card.Header>
      <Card.Body>
        <Line data={chartData} options={chartOptions} />
      </Card.Body>
    </Card>
  );
};

export default SprintBurndown;