import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function UpcomingDeadlinesPage() {
    const navigate = useNavigate();
    useEffect(() => {
        navigate("/processes/runs?quick_filter=soon", { replace: true });
    }, [navigate]);
    return null;
}
