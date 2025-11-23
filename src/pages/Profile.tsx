import React from "react";
import { useParams } from "react-router-dom";

const Profile: React.FC = () => {
  const { userIdentifier } = useParams<{ userIdentifier?: string }>();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        {userIdentifier ? (
          <p>Viewing profile for <strong>{userIdentifier}</strong>.</p>
        ) : (
          <p>Your profile overview will appear here.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
