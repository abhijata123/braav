const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface NotificationPayload {
  recipient_email: string;
  title: string;
  message: string;
  url?: string;
  icon?: string;
  type: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse the request body
    const payload: NotificationPayload = await req.json();
    
    if (!payload.recipient_email || !payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipient_email, title, message" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get Webpushr credentials from environment variables
    const apiKey = Deno.env.get("WEBPUSHR_API_KEY");
    const authToken = Deno.env.get("WEBPUSHR_AUTH_TOKEN");

    if (!apiKey || !authToken) {
      console.error("Missing Webpushr credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Prepare the Webpushr API payload
    const webpushrPayload = {
      title: payload.title,
      message: payload.message,
      target_url: payload.url || "https://coins.braav.co/notifications",
      icon: payload.icon || "https://coins.braav.co/braavco_logo_512x512.png",
      // Send to specific user by email (if supported) or to all subscribers
      // Note: Webpushr might require subscriber IDs instead of emails
      // You may need to adjust this based on your Webpushr setup
      segments: ["All"], // Default to all subscribers for now
      // If you have user-specific targeting, you can use:
      // user_list: [payload.recipient_email],
    };

    // Make the API call to Webpushr
    const webpushrResponse = await fetch("https://api.webpushr.com/v1/notification/send/sid", {
      method: "POST",
      headers: {
        "webpushrKey": apiKey,
        "webpushrAuthToken": authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webpushrPayload),
    });

    const webpushrResult = await webpushrResponse.json();

    if (!webpushrResponse.ok) {
      console.error("Webpushr API error:", webpushrResult);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send push notification",
          details: webpushrResult 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Push notification sent successfully:", webpushrResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Push notification sent successfully",
        webpushr_response: webpushrResult,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send push notification",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});