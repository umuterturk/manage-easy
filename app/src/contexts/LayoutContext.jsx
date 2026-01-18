import { createContext, useContext, useState } from 'react';

const LayoutContext = createContext();

export const useLayout = () => {
    return useContext(LayoutContext);
};

export const LayoutProvider = ({ children }) => {
    const [breadcrumbs, setBreadcrumbs] = useState(null);
    const [headerContent, setHeaderContent] = useState(null);

    return (
        <LayoutContext.Provider value={{ breadcrumbs, setBreadcrumbs, headerContent, setHeaderContent }}>
            {children}
        </LayoutContext.Provider>
    );
};
